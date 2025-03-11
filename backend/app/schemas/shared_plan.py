from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SharedPlanBase(BaseModel):
    plan_id: int
    shared_with_id: int
    can_edit: bool = False

class SharedPlanCreate(SharedPlanBase):
    pass

class SharedPlanResponse(SharedPlanBase):
    id: int
    owner_id: int
    shared_at: datetime
    
    class Config:
        from_attributes = True 