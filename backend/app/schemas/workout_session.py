from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Exercise Set schemas
class ExerciseSetBase(BaseModel):
    reps: int
    weight: Optional[float] = None
    set_number: int
    is_warmup: bool = False
    perceived_effort: Optional[int] = None

class ExerciseSetCreate(ExerciseSetBase):
    pass

class ExerciseSetUpdate(BaseModel):
    reps: Optional[int] = None
    weight: Optional[float] = None
    is_warmup: Optional[bool] = None
    perceived_effort: Optional[int] = None

class ExerciseSetResponse(ExerciseSetBase):
    id: int
    session_exercise_id: int
    completed_at: datetime
    
    class Config:
        from_attributes = True

# Session Exercise schemas
class SessionExerciseBase(BaseModel):
    exercise_id: int
    sets_completed: int
    order: int
    notes: Optional[str] = None

class SessionExerciseCreate(SessionExerciseBase):
    sets: Optional[List[ExerciseSetCreate]] = None

class SessionExerciseUpdate(BaseModel):
    sets_completed: Optional[int] = None
    notes: Optional[str] = None

class SessionExerciseResponse(SessionExerciseBase):
    id: int
    session_id: int
    sets: List[ExerciseSetResponse] = []
    name: Optional[str] = None
    muscle_group: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    equipment: Optional[str] = None
    target_weight: Optional[float] = None
    target_reps: Optional[int] = None
    rest_seconds: Optional[int] = None
    sets_count: Optional[int] = None
    
    class Config:
        from_attributes = True

# Workout Session schemas
class WorkoutSessionBase(BaseModel):
    workout_plan_id: Optional[int] = None
    day_of_week: Optional[int] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    status: Optional[str] = "in_progress"

class WorkoutSessionCreate(WorkoutSessionBase):
    exercises: Optional[List[SessionExerciseCreate]] = None
    start_time: Optional[datetime] = None

class WorkoutSessionUpdate(BaseModel):
    end_time: Optional[datetime] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    status: Optional[str] = None

class WorkoutSessionResponse(WorkoutSessionBase):
    id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    exercises: List[SessionExerciseResponse] = []
    
    class Config:
        from_attributes = True 