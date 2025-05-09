from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Plan Exercise schemas
class PlanExerciseBase(BaseModel):
    exercise_id: int
    sets: int = Field(..., gt=0)
    reps: int = Field(..., gt=0)
    rest_seconds: Optional[int] = None
    order: int
    day_of_week: Optional[int] = None
    progression_type: Optional[str] = None
    progression_value: Optional[float] = None
    progression_threshold: Optional[int] = None
    
    @validator('rest_seconds', 'progression_threshold', pre=True, allow_reuse=True)
    def validate_positive_values(cls, v):
        if v is not None and v < 0:
            raise ValueError("Value must be positive")
        return v
        
    @validator('progression_value', pre=True, allow_reuse=True)
    def validate_positive_float(cls, v):
        if v is not None and v < 0:
            raise ValueError("Value must be positive")
        return v

class PlanExerciseCreate(PlanExerciseBase):
    pass

class PlanExerciseUpdate(BaseModel):
    sets: Optional[int] = None
    reps: Optional[int] = None
    rest_seconds: Optional[int] = None
    order: Optional[int] = None
    day_of_week: Optional[int] = None
    progression_type: Optional[str] = None
    progression_value: Optional[float] = None
    progression_threshold: Optional[int] = None

class PlanExerciseResponse(PlanExerciseBase):
    id: int
    workout_plan_id: int
    name: Optional[str] = None
    muscle_group: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    equipment: Optional[str] = None
    exercise_details: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

# Workout Plan schemas
class WorkoutPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False
    is_active: bool = False
    days_per_week: Optional[int] = None
    duration_weeks: Optional[int] = None

class WorkoutPlanCreate(WorkoutPlanBase):
    exercises: Optional[List[PlanExerciseCreate]] = None

class WorkoutPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None
    days_per_week: Optional[int] = None
    duration_weeks: Optional[int] = None

class WorkoutPlanResponse(WorkoutPlanBase):
    id: int
    owner_id: int
    created_at: datetime
    exercises: List[PlanExerciseResponse] = []
    exercises_count: Optional[int] = None
    is_active_for_current_user: bool = False
    
    class Config:
        from_attributes = True
        arbitrary_types_allowed = True

# User Program Progress schemas
class UserProgramProgressBase(BaseModel):
    user_id: int
    workout_plan_id: int
    exercise_id: int
    current_weight: Optional[float] = None
    current_reps: Optional[int] = None
    next_weight: Optional[float] = None
    next_reps: Optional[int] = None
    progression_status: int = 0

    @validator('current_weight', 'next_weight', pre=True, allow_reuse=True)
    def validate_positive_weight(cls, v):
        if v is not None and v < 0:
            raise ValueError("Weight cannot be negative")
        return v

    @validator('current_reps', 'next_reps', 'progression_status', pre=True, allow_reuse=True)
    def validate_positive_int(cls, v):
        if v is not None and v < 0:
            raise ValueError("Value must be non-negative")
        return v

class UserProgramProgressCreate(UserProgramProgressBase):
    pass

class UserProgramProgressUpdate(BaseModel):
    current_weight: Optional[float] = None
    current_reps: Optional[int] = None
    next_weight: Optional[float] = None
    next_reps: Optional[int] = None
    progression_status: Optional[int] = None

    @validator('current_weight', 'next_weight', pre=True, allow_reuse=True)
    def validate_positive_weight(cls, v):
        if v is not None and v < 0:
            raise ValueError("Weight cannot be negative")
        return v

    @validator('current_reps', 'next_reps', 'progression_status', pre=True, allow_reuse=True)
    def validate_positive_int(cls, v):
        if v is not None and v < 0:
            raise ValueError("Value must be non-negative")
        return v

class UserProgramProgressResponse(UserProgramProgressBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True 