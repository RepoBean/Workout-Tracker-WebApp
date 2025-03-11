from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Plan Exercise schemas
class PlanExerciseBase(BaseModel):
    exercise_id: int
    sets: int
    reps: int
    rest_seconds: Optional[int] = None
    target_weight: Optional[float] = None
    order: int
    day_of_week: Optional[int] = None
    progression_type: Optional[str] = None
    progression_value: Optional[float] = None
    progression_threshold: Optional[int] = None

class PlanExerciseCreate(PlanExerciseBase):
    pass

class PlanExerciseUpdate(BaseModel):
    sets: Optional[int] = None
    reps: Optional[int] = None
    rest_seconds: Optional[int] = None
    target_weight: Optional[float] = None
    order: Optional[int] = None
    day_of_week: Optional[int] = None
    progression_type: Optional[str] = None
    progression_value: Optional[float] = None
    progression_threshold: Optional[int] = None

class PlanExerciseResponse(PlanExerciseBase):
    id: int
    workout_plan_id: int
    
    class Config:
        from_attributes = True

# Workout Plan schemas
class WorkoutPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False
    days_per_week: Optional[int] = None
    duration_weeks: Optional[int] = None

class WorkoutPlanCreate(WorkoutPlanBase):
    exercises: Optional[List[PlanExerciseCreate]] = None

class WorkoutPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    days_per_week: Optional[int] = None
    duration_weeks: Optional[int] = None

class WorkoutPlanResponse(WorkoutPlanBase):
    id: int
    owner_id: int
    created_at: datetime
    exercises: List[PlanExerciseResponse] = []
    
    class Config:
        from_attributes = True 