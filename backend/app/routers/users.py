from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

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
    # Deserialize settings if they exist
    if current_user.settings:
        if isinstance(current_user.settings, dict):
            # Already deserialized, no need to parse
            pass
        else:
            try:
                current_user.settings = json.loads(current_user.settings)
            except json.JSONDecodeError:
                current_user.settings = {}
    else:
        current_user.settings = {}
        
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
    if user_update.settings is not None:
        # Serialize settings to JSON string for storage
        current_user.settings = json.dumps(user_update.settings)
    
    db.commit()
    db.refresh(current_user)
    
    # Deserialize settings for response
    if current_user.settings:
        try:
            current_user.settings = json.loads(current_user.settings)
        except json.JSONDecodeError:
            current_user.settings = {}
    else:
        current_user.settings = {}
    
    return current_user

@router.put("/me/onboarding", response_model=UserResponse)
async def mark_onboarding_complete(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Mark the current user's onboarding as complete.
    """
    user_settings = {}
    # --- Refined Settings Deserialization Start ---
    if isinstance(current_user.settings, str):
        try:
            user_settings = json.loads(current_user.settings)
        except json.JSONDecodeError:
            print(f"Warning: Could not decode settings JSON for user {current_user.id}: {current_user.settings}")
            user_settings = {} # Default to empty dict on decode error
    elif current_user.settings is None:
        user_settings = {}
    else:
        # Should ideally not happen if DB stores as TEXT, but handle defensively
        print(f"Warning: User settings field is unexpected type ({type(current_user.settings)}) for user {current_user.id}")
        user_settings = {}
        
    # Temporarily attach the deserialized dict for the response model
    # Note: This does NOT change the underlying DB value which remains a string
    current_user.settings_dict = user_settings 
    # --- Refined Settings Deserialization End ---

    if current_user.has_completed_onboarding:
         # User has already completed onboarding, just return current state
         # Ensure settings_dict is attached for response consistency
         current_user.settings_dict = user_settings
         return current_user
             
    current_user.has_completed_onboarding = True
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    # --- Refresh settings for response after db refresh --- 
    refreshed_user_settings = {}
    if isinstance(current_user.settings, str):
        try:
            refreshed_user_settings = json.loads(current_user.settings)
        except json.JSONDecodeError:
            refreshed_user_settings = {}
    elif current_user.settings is None:
         refreshed_user_settings = {}
    
    current_user.settings_dict = refreshed_user_settings
    # --- End refresh settings for response --- 
        
    # Ensure the response model can handle settings_dict if UserResponse expects settings
    # If UserResponse expects 'settings' as a string, this might need adjustment
    # or the schema needs to expect a dict/any. For now, assuming it can handle it.
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
    users_from_db = db.query(User).offset(skip).limit(limit).all()
    
    # Process users to ensure settings is a dict or None
    processed_users = []
    for user in users_from_db:
        user_settings = None # Default to None
        if isinstance(user.settings, str):
            try:
                user_settings = json.loads(user.settings)
            except json.JSONDecodeError:
                # Log error or handle as needed, default to None or empty dict
                print(f"Warning: Could not decode settings JSON for user {user.id}: {user.settings}")
                user_settings = None 
        elif isinstance(user.settings, dict):
             user_settings = user.settings # Already a dict
        # If user.settings is None or other type, it remains None
        
        # We need to make sure the UserResponse model gets the processed settings.
        # Pydantic v2 with from_attributes=True should handle this if we return 
        # the original user object, as long as the attribute exists during conversion.
        # A safer way might be to construct the response models manually, 
        # but let's try relying on from_attributes first after ensuring settings are dict/None.
        # We can temporarily assign the processed dict to the user object for Pydantic to pick up.
        # Note: This is a temporary attribute for response serialization
        user.processed_settings = user_settings 
        processed_users.append(user)
        
    # Pydantic should now correctly map user.processed_settings to UserResponse.settings
    # if UserResponse schema includes 'processed_settings' or if orm_mode handles it.
    # Let's adjust UserResponse to handle this if needed, or adjust the return.
    
    # Alternative: Manually create UserResponse objects
    response_users = []
    for user in users_from_db:
        user_settings = None
        if isinstance(user.settings, str):
            try:
                user_settings = json.loads(user.settings)
            except json.JSONDecodeError:
                user_settings = None
        elif isinstance(user.settings, dict):
            user_settings = user.settings
            
        response_users.append(
            UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                is_admin=user.is_admin,
                is_first_user=user.is_first_user,
                has_completed_onboarding=user.has_completed_onboarding,
                created_at=user.created_at,
                last_login=user.last_login,
                profile_picture=user.profile_picture,
                settings=user_settings # Pass the processed dict/None here
            )
        )
        
    return response_users
    # return processed_users # This might fail if Pydantic doesn't map correctly

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

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Delete a user account by ID. Admin only.
    Prevents admins from deleting themselves via this endpoint.
    """
    # Prevent admin from deleting themselves via this route
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot delete their own account through this endpoint."
        )
    
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    
    if not user_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found",
        )
        
    # Add cascade delete logic or checks for related data if necessary here
    # For example, check if the user owns plans, sessions, etc. and decide how to handle them.
    # Simple deletion for now:
    db.delete(user_to_delete)
    db.commit()
    
    # No content to return on successful deletion
    return 