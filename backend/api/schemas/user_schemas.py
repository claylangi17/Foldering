from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    company_code: Optional[int] = None  # Company code for filtering data
    disabled: Optional[bool] = False  # To disable user accounts


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserInDBBase(UserBase):
    id: int
    role: str = Field(default="user")  # Default role is 'user'

    class Config:
        from_attributes = True


class User(UserInDBBase):  # Schema for returning user data (without password)
    pass


class UserInDB(UserInDBBase):  # Schema for user data stored in DB (with hashed_password)
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None  # Add role to token data
