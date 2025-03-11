from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import User
from app.schemas.user import UserResponse, UserUpdate
from app.services.auth import (
    get_current_active_user,
    get_current_admin_user,
    get_password_hash,
)

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get information about the currently authenticated user.
    """
    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update the currently authenticated user's information.
    """
    # Check if username is being updated and already exists
    if user_update.username and user_update.username != current_user.username:
        db_user = db.query(User).filter(User.username == user_update.username).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
    
    # Check if email is being updated and already exists
    if user_update.email and user_update.email != current_user.email:
        db_user = db.query(User).filter(User.email == user_update.email).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
    
    # Update user fields
    if user_update.username:
        current_user.username = user_update.username
    if user_update.email:
        current_user.email = user_update.email
    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)
    if user_update.profile_picture is not None:
        current_user.profile_picture = user_update.profile_picture
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.get("", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user)
):
    """
    Get a list of all users. Admin only.
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user)
):
    """
    Get a specific user by ID. Admin only.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user

@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    is_admin: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Update a user's admin status. Admin only.
    """
    # Prevent admin from removing their own admin status
    if user_id == current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin status",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    user.is_admin = is_admin
    db.commit()
    db.refresh(user)
    
    return user 