from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
# Import ValidationError for Pydantic model validation
from pydantic import ValidationError

# Adjusted import path assuming core is sibling to schemas
from ..schemas import user_schemas
# Adjusted import path assuming core is sibling to services
from ..services import auth_service
from . import security  # Import security utilities from the same core directory

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token")  # Points to your login endpoint


async def get_current_user(token: str = Depends(oauth2_scheme)) -> user_schemas.UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, security.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception

        # Validate payload structure with TokenPayload schema
        token_data = security.TokenPayload(
            sub=username, role=payload.get("role"), exp=payload.get("exp"))

    except (JWTError, ValidationError):  # Catch both JWT errors and Pydantic validation errors
        raise credentials_exception

    user = auth_service.get_user_by_username(username=token_data.sub)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: user_schemas.UserInDB = Depends(get_current_user)) -> user_schemas.UserInDB:
    if current_user.disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user


async def get_current_active_spv_user(current_user: user_schemas.UserInDB = Depends(get_current_active_user)) -> user_schemas.UserInDB:
    if not current_user.role or current_user.role.lower() != "spv":  # Case-insensitive check
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges (SPV role required)",
        )
    return current_user
