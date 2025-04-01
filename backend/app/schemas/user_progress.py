from pydantic import BaseModel, validator, Field
from typing import Optional, List
from datetime import datetime

# Schema for a single progress update item in the batch request
class UserProgressUpdateItem(BaseModel):
    exercise_id: int
    current_weight: Optional[float] = None # Weight in kg
    current_reps: Optional[int] = None # Optional: Can also update reps if needed

    @validator('current_weight', pre=True, allow_reuse=True)
    def validate_positive_weight(cls, v):
        if v is not None and v < 0:
            raise ValueError("Weight cannot be negative")
        return v

    @validator('current_reps', pre=True, allow_reuse=True)
    def validate_positive_int(cls, v):
        if v is not None and v < 0:
            raise ValueError("Value must be non-negative")
        return v

# Schema for the batch update request body
class UserProgressBatchUpdatePayload(BaseModel):
    workout_plan_id: int
    updates: List[UserProgressUpdateItem]

# Basic response schema after update (can be enhanced later)
class UserProgressResponseItem(BaseModel):
    user_id: int
    workout_plan_id: int
    exercise_id: int
    current_weight: Optional[float]
    current_reps: Optional[int]
    next_weight: Optional[float]
    next_reps: Optional[int]
    progression_status: int
    last_updated: datetime

    class Config:
        from_attributes = True

class UserProgressBatchUpdateResponse(BaseModel):
    message: str
    updated_count: int
    # Optionally return the updated records
    # updated_records: List[UserProgressResponseItem] = []