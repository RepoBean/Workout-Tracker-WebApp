from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    profile_picture: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class UserResponse(UserBase):
    id: int
    is_admin: bool
    is_first_user: bool
    has_completed_onboarding: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    profile_picture: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str 