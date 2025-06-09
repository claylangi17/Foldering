from ..core.dependencies import get_current_active_user, get_current_active_spv_user # Import the dependency
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

from ..schemas import user_schemas # Token and TokenData are in user_schemas
from ..schemas.user_schemas import UserCompanyUpdate # Import the new schema
from ..services import auth_service, user_service # Import the new service
from ..core import security

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=user_schemas.User)
async def register_user(user_in: user_schemas.UserCreate):
    """
    Register a new user.
    Default role will be 'user'.
    """
    db_user = auth_service.get_user_by_username(username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Potentially add email check as well if email is meant to be unique
    # existing_email_user = auth_service.get_user_by_email(email=user_in.email)
    # if existing_email_user:
    #     raise HTTPException(status_code=400, detail="Email already registered")

    created_user = auth_service.create_user(user_in=user_in)
    if not created_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create user."
        )
    return created_user


@router.post("/token", response_model=user_schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = auth_service.authenticate_user(
        username=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token_expires = timedelta(
        minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Endpoint to get current user info (example of a protected route)


@router.get("/users/me", response_model=user_schemas.User)
async def read_users_me(current_user: user_schemas.UserInDB = Depends(get_current_active_user)):
    """
    Fetch the current logged in user.
    """
    # current_user is of type UserInDB (which includes hashed_password)
    # Pydantic will automatically convert it to User schema for the response,
    # which excludes hashed_password.
    return current_user


@router.put("/users/me/company", response_model=user_schemas.User)
async def update_current_user_company(
    company_update_data: UserCompanyUpdate,
    current_spv_user: user_schemas.UserInDB = Depends(get_current_active_spv_user) # Use SPV dependency
):
    """
    Update the company for the currently authenticated SPV user.
    """
    updated_user = user_service.update_user_company(
        user_id=current_spv_user.id,
        new_company_code=company_update_data.new_company_code
    )
    if not updated_user:
        # Consider if 404 is always right, or if 400 for invalid company_code, or 500 for DB error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Failed to update user company. User not found, invalid company code, or company already set."
        )
    return updated_user
