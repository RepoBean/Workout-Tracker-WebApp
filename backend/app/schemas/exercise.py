from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    equipment: Optional[str] = None
    muscle_group: Optional[str] = None
    secondary_muscle_groups: Optional[str] = None
    instructions: Optional[str] = None
    starting_weight_kg: Optional[float] = None
    starting_weight_lb: Optional[float] = None
    progression_type: Optional[str] = None
    progression_value: Optional[float] = None
    difficulty_level: Optional[str] = None

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    equipment: Optional[str] = None
    muscle_group: Optional[str] = None
    secondary_muscle_groups: Optional[str] = None
    instructions: Optional[str] = None
    starting_weight_kg: Optional[float] = None
    starting_weight_lb: Optional[float] = None
    progression_type: Optional[str] = None
    progression_value: Optional[float] = None
    difficulty_level: Optional[str] = None

class ExerciseResponse(ExerciseBase):
    id: int
    is_system: bool
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True 