from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import database, models
from ..schemas.user import UserResponse
# from ..services.auth import get_current_active_user # No longer needed directly here
from ..services.auth import get_current_admin_user # Import the correct dependency

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    responses={404: {"description": "Not found"}},
)

# Dependency to check if the user is an admin # REMOVE THIS FUNCTION
# async def get_current_admin_user(current_user: models.User = Depends(get_current_active_user)) -> models.User:
#     if not current_user.is_admin:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Operation not permitted. Requires admin privileges."
#         )
#     return current_user

# @router.get("/users", response_model=List[UserResponse]) # REMOVE THIS ROUTE
# async def get_all_users(
#     db: Session = Depends(database.get_db),
#     # current_admin: models.User = Depends(get_current_admin_user) # Ensure user is admin
#     # Use the imported dependency directly
#     current_admin: models.User = Depends(get_current_admin_user)
# ):
#     """
#     Retrieves a list of all registered users.
#     Requires admin privileges.
#     """
#     users = db.query(models.User).order_by(models.User.id).all()
#     return users

# Add more admin routes here (e.g., delete user, update user roles) 