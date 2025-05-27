from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# Configuration for JWT
# !! PENTING: Ganti SECRET_KEY ini dengan string acak yang kuat di production!
# Anda bisa generate menggunakan: openssl rand -hex 32
SECRET_KEY = "your-super-secret-key-please-change-me"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Token berlaku selama 30 menit

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenPayload(BaseModel):
    sub: Optional[str] = None  # 'sub' typically holds the username or user ID
    exp: Optional[datetime] = None
    role: Optional[str] = None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + \
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Pastikan semua nilai dalam to_encode bisa di-serialize oleh JWT (misalnya, datetime adalah datetime, bukan string)
    # 'exp' sudah datetime. 'sub' dan 'role' adalah string.
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Fungsi untuk decode token dan mendapatkan payload (akan dikembangkan lebih lanjut
# untuk digunakan dengan FastAPI dependency injection untuk mendapatkan current_user)
# Contoh:
# from fastapi import Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordBearer
# from ..schemas.user_schemas import User
# from . import crud # Asumsi ada crud operations untuk user

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token") # tokenUrl akan menunjuk ke endpoint login

# async def get_current_user(token: str = Depends(oauth2_scheme)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         username: str = payload.get("sub")
#         if username is None:
#             raise credentials_exception
#         token_data = TokenPayload(sub=username, role=payload.get("role"))
#     except JWTError:
#         raise credentials_exception
#     user = crud.get_user_by_username(username=token_data.sub) # Perlu fungsi crud.get_user_by_username
#     if user is None:
#         raise credentials_exception
#     return user

# async def get_current_active_user(current_user: User = Depends(get_current_user)):
#     if current_user.disabled:
#         raise HTTPException(status_code=400, detail="Inactive user")
#     return current_user
