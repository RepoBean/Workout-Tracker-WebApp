from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import Exercise, User
from app.schemas.exercise import ExerciseCreate, ExerciseUpdate, ExerciseResponse
from app.services.auth import get_current_active_user, get_current_admin_user

router = APIRouter()

@router.post("", response_model=ExerciseResponse)
async def create_exercise(
    exercise: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new exercise.
    """
    # Check if exercise with same name already exists
    db_exercise = db.query(Exercise).filter(Exercise.name == exercise.name).first()
    if db_exercise:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exercise with this name already exists",
        )
    
    # Create new exercise
    db_exercise = Exercise(
        name=exercise.name,
        description=exercise.description,
        category=exercise.category,
        equipment=exercise.equipment,
        muscle_group=exercise.muscle_group,
        instructions=exercise.instructions,
        is_system=False,
        created_by=current_user.id,
    )
    
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    
    return db_exercise

@router.get("", response_model=List[ExerciseResponse])
async def get_exercises(
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    category: Optional[str] = None,
    equipment: Optional[str] = None,
    muscle_group: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a list of exercises with optional filtering.
    """
    query = db.query(Exercise)
    
    # Apply filters if provided
    if name:
        query = query.filter(Exercise.name.ilike(f"%{name}%"))
    if category:
        query = query.filter(Exercise.category == category)
    if equipment:
        query = query.filter(Exercise.equipment == equipment)
    if muscle_group:
        query = query.filter(Exercise.muscle_group == muscle_group)
    
    # Get exercises (system exercises + user's own exercises)
    exercises = query.filter(
        (Exercise.is_system == True) | (Exercise.created_by == current_user.id)
    ).offset(skip).limit(limit).all()
    
    return exercises

@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific exercise by ID.
    """
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    
    # Check if user has access to this exercise
    if not exercise.is_system and exercise.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this exercise",
        )
    
    return exercise

@router.put("/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise(
    exercise_id: int,
    exercise_update: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an exercise.
    """
    db_exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    if not db_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    
    # Check if user has permission to update this exercise
    if db_exercise.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system exercises",
        )
    
    if not db_exercise.is_system and db_exercise.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this exercise",
        )
    
    # Update exercise fields
    if exercise_update.name is not None:
        # Check if new name conflicts with existing exercise
        if exercise_update.name != db_exercise.name:
            name_exists = db.query(Exercise).filter(Exercise.name == exercise_update.name).first()
            if name_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Exercise with this name already exists",
                )
        db_exercise.name = exercise_update.name
    
    if exercise_update.description is not None:
        db_exercise.description = exercise_update.description
    if exercise_update.category is not None:
        db_exercise.category = exercise_update.category
    if exercise_update.equipment is not None:
        db_exercise.equipment = exercise_update.equipment
    if exercise_update.muscle_group is not None:
        db_exercise.muscle_group = exercise_update.muscle_group
    if exercise_update.instructions is not None:
        db_exercise.instructions = exercise_update.instructions
    
    db.commit()
    db.refresh(db_exercise)
    
    return db_exercise

@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an exercise.
    """
    db_exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    if not db_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    
    # Check if user has permission to delete this exercise
    if db_exercise.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system exercises",
        )
    
    if not db_exercise.is_system and db_exercise.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this exercise",
        )
    
    # Check if exercise is used in any workout plans
    if db_exercise.plan_exercises:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete exercise that is used in workout plans",
        )
    
    db.delete(db_exercise)
    db.commit()
    
    return None

@router.post("/system", response_model=ExerciseResponse)
async def create_system_exercise(
    exercise: ExerciseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user)
):
    """
    Create a new system exercise. Admin only.
    """
    # Check if exercise with same name already exists
    db_exercise = db.query(Exercise).filter(Exercise.name == exercise.name).first()
    if db_exercise:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exercise with this name already exists",
        )
    
    # Create new system exercise
    db_exercise = Exercise(
        name=exercise.name,
        description=exercise.description,
        category=exercise.category,
        equipment=exercise.equipment,
        muscle_group=exercise.muscle_group,
        instructions=exercise.instructions,
        is_system=True,
        created_by=None,
    )
    
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    
    return db_exercise

@router.get("/categories/list", response_model=List[str])
async def get_exercise_categories(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user)
):
    """
    Get a list of all exercise categories.
    """
    categories = db.query(Exercise.category).distinct().filter(Exercise.category != None).all()
    return [category[0] for category in categories]

@router.get("/equipment/list", response_model=List[str])
async def get_exercise_equipment(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user)
):
    """
    Get a list of all exercise equipment.
    """
    equipment = db.query(Exercise.equipment).distinct().filter(Exercise.equipment != None).all()
    return [eq[0] for eq in equipment]

@router.get("/muscle-groups/list", response_model=List[str])
async def get_muscle_groups(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user)
):
    """
    Get a list of all muscle groups.
    """
    muscle_groups = db.query(Exercise.muscle_group).distinct().filter(Exercise.muscle_group != None).all()
    return [mg[0] for mg in muscle_groups] 