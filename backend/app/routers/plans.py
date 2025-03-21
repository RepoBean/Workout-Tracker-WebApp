from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import json
from fastapi import File, UploadFile, Response, Form

from app.database import get_db
from app.models.models import WorkoutPlan, PlanExercise, Exercise, User
from app.schemas.workout_plan import (
    WorkoutPlanCreate, 
    WorkoutPlanUpdate, 
    WorkoutPlanResponse,
    PlanExerciseCreate,
    PlanExerciseUpdate,
    PlanExerciseResponse
)
from app.services.auth import get_current_active_user

router = APIRouter()

# Add weight conversion utility function
def convert_weight(weight, from_unit, to_unit="kg"):
    """Convert weight between lbs and kg."""
    if weight is None or weight == 0:
        return 0
        
    if from_unit.lower() == to_unit.lower():
        return weight
        
    if from_unit.lower() == "lbs" and to_unit.lower() == "kg":
        return round(weight * 0.453592, 2)  # lb to kg
    elif from_unit.lower() == "kg" and to_unit.lower() == "lbs":
        return round(weight * 2.20462, 2)  # kg to lb
        
    return weight  # Default case - no conversion

@router.post("", response_model=WorkoutPlanResponse)
async def create_workout_plan(
    plan: WorkoutPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new workout plan with optional exercises.
    Plans are public by default unless specified otherwise.
    """
    # Set default value for is_public if not provided
    is_public = plan.is_public if plan.is_public is not None else True
    
    # Create new workout plan
    db_plan = WorkoutPlan(
        name=plan.name,
        description=plan.description,
        owner_id=current_user.id,
        is_public=is_public,
        days_per_week=plan.days_per_week,
        duration_weeks=plan.duration_weeks
    )
    
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    
    # Add exercises if provided
    if plan.exercises:
        for i, exercise_data in enumerate(plan.exercises):
            # Verify exercise exists
            exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
            if not exercise:
                db.delete(db_plan)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Exercise with id {exercise_data.exercise_id} not found"
                )
            
            # Create plan exercise
            db_plan_exercise = PlanExercise(
                workout_plan_id=db_plan.id,
                exercise_id=exercise_data.exercise_id,
                sets=exercise_data.sets,
                reps=exercise_data.reps,
                rest_seconds=exercise_data.rest_seconds,
                target_weight=exercise_data.target_weight,
                order=exercise_data.order if exercise_data.order is not None else i,
                day_of_week=exercise_data.day_of_week,
                progression_type=exercise_data.progression_type,
                progression_value=exercise_data.progression_value,
                progression_threshold=exercise_data.progression_threshold
            )
            
            db.add(db_plan_exercise)
        
        db.commit()
        db.refresh(db_plan)
    
    return db_plan

@router.get("", response_model=List[WorkoutPlanResponse])
async def get_workout_plans(
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    include_public: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all workout plans for the current user.
    Optionally include public plans from other users.
    """
    query = db.query(WorkoutPlan)
    
    # Filter by name if provided
    if name:
        query = query.filter(WorkoutPlan.name.ilike(f"%{name}%"))
    
    # Get user's own plans and optionally public plans
    if include_public:
        query = query.filter(
            (WorkoutPlan.owner_id == current_user.id) | 
            (WorkoutPlan.is_public == True)
        )
    else:
        query = query.filter(WorkoutPlan.owner_id == current_user.id)
    
    # Order by creation date (newest first)
    query = query.order_by(desc(WorkoutPlan.created_at))
    
    # Paginate results
    plans = query.offset(skip).limit(limit).all()
    
    # Add exercise count to each plan
    plan_responses = []
    for plan in plans:
        # Count the exercises in this plan
        exercise_count = db.query(PlanExercise).filter(PlanExercise.workout_plan_id == plan.id).count()
        
        # Convert plan to dict for response
        plan_dict = {
            "id": plan.id,
            "name": plan.name,
            "description": plan.description,
            "is_public": plan.is_public,
            "is_active": plan.is_active,
            "days_per_week": plan.days_per_week,
            "duration_weeks": plan.duration_weeks,
            "owner_id": plan.owner_id,
            "created_at": plan.created_at,
            "exercises": [],  # We don't need the full exercise details in the list view
            "exercises_count": exercise_count
        }
        plan_responses.append(plan_dict)
    
    return plan_responses

@router.get("/next", response_model=WorkoutPlanResponse)
async def get_next_workout_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the currently active workout plan for the user.
    Returns the first plan with is_active=True for the user.
    """
    # Check for active plans where the user is the owner
    active_plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.owner_id == current_user.id,
        WorkoutPlan.is_active == True
    ).first()
    
    if not active_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active workout plan found"
        )
    
    # Count the exercises in the plan
    exercise_count = db.query(PlanExercise).filter(
        PlanExercise.workout_plan_id == active_plan.id
    ).count()
    
    # Set the exercises_count field
    active_plan.exercises_count = exercise_count
    
    # Load exercise details for the plan exercises
    for plan_exercise in active_plan.exercises:
        exercise = db.query(Exercise).filter(Exercise.id == plan_exercise.exercise_id).first()
        if exercise:
            plan_exercise.name = exercise.name
            plan_exercise.muscle_group = exercise.muscle_group
            plan_exercise.description = exercise.description
            plan_exercise.category = exercise.category
            plan_exercise.equipment = exercise.equipment
    
    return active_plan

@router.get("/{plan_id}", response_model=WorkoutPlanResponse)
async def get_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific workout plan by ID.
    Users can access their own plans and public plans.
    """
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check if user has access to this plan
    if plan.owner_id != current_user.id and not plan.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this workout plan"
        )
    
    # Count the exercises in the plan
    exercise_count = db.query(PlanExercise).filter(
        PlanExercise.workout_plan_id == plan.id
    ).count()
    
    # Set the exercises_count field
    plan.exercises_count = exercise_count
    
    # Load exercise details for the plan exercises
    for plan_exercise in plan.exercises:
        exercise = db.query(Exercise).filter(Exercise.id == plan_exercise.exercise_id).first()
        if exercise:
            plan_exercise.name = exercise.name
            plan_exercise.muscle_group = exercise.muscle_group
            plan_exercise.description = exercise.description
            plan_exercise.category = exercise.category
            plan_exercise.equipment = exercise.equipment
    
    return plan

@router.put("/{plan_id}", response_model=WorkoutPlanResponse)
async def update_workout_plan(
    plan_id: int,
    plan_update: WorkoutPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a workout plan.
    Users can only update their own plans.
    If is_active is set to True, all other plans will be set to inactive.
    """
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check if user owns this plan
    if db_plan.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this workout plan"
        )
    
    # If activating this plan, deactivate all others
    if plan_update.is_active is True and not db_plan.is_active:
        # Set all other plans to inactive
        db.query(WorkoutPlan).filter(
            WorkoutPlan.owner_id == current_user.id,
            WorkoutPlan.id != plan_id
        ).update({"is_active": False})
    
    # Update plan fields
    if plan_update.name is not None:
        db_plan.name = plan_update.name
    if plan_update.description is not None:
        db_plan.description = plan_update.description
    if plan_update.is_public is not None:
        db_plan.is_public = plan_update.is_public
    if plan_update.is_active is not None:
        db_plan.is_active = plan_update.is_active
    if plan_update.days_per_week is not None:
        db_plan.days_per_week = plan_update.days_per_week
    if plan_update.duration_weeks is not None:
        db_plan.duration_weeks = plan_update.duration_weeks
    
    db.commit()
    db.refresh(db_plan)
    
    return db_plan

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a workout plan.
    Users can only delete their own plans.
    """
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check if user owns this plan
    if db_plan.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this workout plan"
        )
    
    # Delete plan (cascade will delete associated exercises)
    db.delete(db_plan)
    db.commit()
    
    return None

# Plan Exercise Management

@router.post("/{plan_id}/exercises", response_model=PlanExerciseResponse)
async def add_exercise_to_plan(
    plan_id: int,
    exercise: PlanExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add an exercise to a workout plan.
    Users can only modify their own plans.
    """
    # Check if plan exists and user owns it
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    if db_plan.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this workout plan"
        )
    
    # Check if exercise exists
    db_exercise = db.query(Exercise).filter(Exercise.id == exercise.exercise_id).first()
    
    if not db_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercise with id {exercise.exercise_id} not found"
        )
    
    # Determine order if not provided
    if exercise.order is None:
        # Get highest order value and add 1
        max_order = db.query(PlanExercise).filter(
            PlanExercise.workout_plan_id == plan_id
        ).order_by(desc(PlanExercise.order)).first()
        
        order = (max_order.order + 1) if max_order else 0
    else:
        order = exercise.order
    
    # Create new plan exercise
    db_plan_exercise = PlanExercise(
        workout_plan_id=plan_id,
        exercise_id=exercise.exercise_id,
        sets=exercise.sets,
        reps=exercise.reps,
        rest_seconds=exercise.rest_seconds,
        target_weight=exercise.target_weight,
        order=order,
        day_of_week=exercise.day_of_week,
        progression_type=exercise.progression_type,
        progression_value=exercise.progression_value,
        progression_threshold=exercise.progression_threshold
    )
    
    db.add(db_plan_exercise)
    db.commit()
    db.refresh(db_plan_exercise)
    
    return db_plan_exercise

@router.put("/{plan_id}/exercises/{exercise_id}", response_model=PlanExerciseResponse)
async def update_plan_exercise(
    plan_id: int,
    exercise_id: int,
    exercise_update: PlanExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an exercise in a workout plan.
    Users can only modify their own plans.
    """
    # Check if plan exists and user owns it
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    if db_plan.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this workout plan"
        )
    
    # Get the plan exercise
    db_plan_exercise = db.query(PlanExercise).filter(
        PlanExercise.id == exercise_id,
        PlanExercise.workout_plan_id == plan_id
    ).first()
    
    if not db_plan_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this workout plan"
        )
    
    # Update exercise fields
    if exercise_update.sets is not None:
        db_plan_exercise.sets = exercise_update.sets
    if exercise_update.reps is not None:
        db_plan_exercise.reps = exercise_update.reps
    if exercise_update.rest_seconds is not None:
        db_plan_exercise.rest_seconds = exercise_update.rest_seconds
    if exercise_update.target_weight is not None:
        db_plan_exercise.target_weight = exercise_update.target_weight
    if exercise_update.order is not None:
        db_plan_exercise.order = exercise_update.order
    if exercise_update.day_of_week is not None:
        db_plan_exercise.day_of_week = exercise_update.day_of_week
    if exercise_update.progression_type is not None:
        db_plan_exercise.progression_type = exercise_update.progression_type
    if exercise_update.progression_value is not None:
        db_plan_exercise.progression_value = exercise_update.progression_value
    if exercise_update.progression_threshold is not None:
        db_plan_exercise.progression_threshold = exercise_update.progression_threshold
    
    db.commit()
    db.refresh(db_plan_exercise)
    
    return db_plan_exercise

@router.delete("/{plan_id}/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exercise_from_plan(
    plan_id: int,
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove an exercise from a workout plan.
    Users can only modify their own plans.
    """
    # Check if plan exists and user owns it
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    if db_plan.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this workout plan"
        )
    
    # Get the plan exercise
    db_plan_exercise = db.query(PlanExercise).filter(
        PlanExercise.id == exercise_id,
        PlanExercise.workout_plan_id == plan_id
    ).first()
    
    if not db_plan_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this workout plan"
        )
    
    # Delete the plan exercise
    db.delete(db_plan_exercise)
    db.commit()
    
    return None

@router.post("/{plan_id}/exercises/reorder", response_model=WorkoutPlanResponse)
async def reorder_plan_exercises(
    plan_id: int,
    exercise_orders: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Reorder exercises in a workout plan.
    Expects a list of dictionaries with exercise_id and new_order.
    Users can only modify their own plans.
    """
    # Check if plan exists and user owns it
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    if db_plan.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this workout plan"
        )
    
    # Update order for each exercise
    for item in exercise_orders:
        exercise_id = item.get("exercise_id")
        new_order = item.get("new_order")
        
        if exercise_id is None or new_order is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each item must have exercise_id and new_order"
            )
        
        # Get the plan exercise
        db_plan_exercise = db.query(PlanExercise).filter(
            PlanExercise.id == exercise_id,
            PlanExercise.workout_plan_id == plan_id
        ).first()
        
        if not db_plan_exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exercise with id {exercise_id} not found in this workout plan"
            )
        
        # Update order
        db_plan_exercise.order = new_order
    
    db.commit()
    db.refresh(db_plan)
    
    return db_plan

@router.post("/{plan_id}/clone", response_model=WorkoutPlanResponse)
async def clone_workout_plan(
    plan_id: int,
    new_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Clone a workout plan.
    Users can clone their own plans and public plans.
    """
    # Get the original plan
    original_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not original_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check if user has access to this plan
    if original_plan.owner_id != current_user.id and not original_plan.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to clone this workout plan"
        )
    
    # Create new plan
    new_plan = WorkoutPlan(
        name=new_name or f"Copy of {original_plan.name}",
        description=original_plan.description,
        owner_id=current_user.id,
        is_public=False,  # Default to private for cloned plans
        days_per_week=original_plan.days_per_week,
        duration_weeks=original_plan.duration_weeks
    )
    
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    
    # Clone exercises
    for exercise in original_plan.exercises:
        new_exercise = PlanExercise(
            workout_plan_id=new_plan.id,
            exercise_id=exercise.exercise_id,
            sets=exercise.sets,
            reps=exercise.reps,
            rest_seconds=exercise.rest_seconds,
            target_weight=exercise.target_weight,
            order=exercise.order,
            day_of_week=exercise.day_of_week,
            progression_type=exercise.progression_type,
            progression_value=exercise.progression_value,
            progression_threshold=exercise.progression_threshold
        )
        
        db.add(new_exercise)
    
    db.commit()
    db.refresh(new_plan)
    
    return new_plan

@router.post("/{plan_id}/activate", response_model=WorkoutPlanResponse)
async def activate_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Activate a workout plan.
    Only one plan can be active at a time per user.
    """
    # Get the plan to activate
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check if user owns this plan
    if db_plan.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to activate this workout plan"
        )
    
    # Deactivate all other plans for this user
    db.query(WorkoutPlan).filter(
        WorkoutPlan.owner_id == current_user.id,
        WorkoutPlan.id != plan_id
    ).update({"is_active": False})
    
    # Activate this plan
    db_plan.is_active = True
    db.commit()
    db.refresh(db_plan)
    
    return db_plan

@router.get("/{plan_id}/export", response_model=None)
async def export_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Export a workout plan as a JSON file.
    Users can export their own plans or public plans.
    """
    # Get the plan to export
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check if user has access to this plan
    if plan.owner_id != current_user.id and not plan.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export this workout plan"
        )
    
    # Fetch the exercises for this plan
    plan_exercises = db.query(PlanExercise).filter(
        PlanExercise.workout_plan_id == plan_id
    ).all()
    
    # Get exercise details
    for plan_exercise in plan_exercises:
        exercise = db.query(Exercise).filter(Exercise.id == plan_exercise.exercise_id).first()
        if exercise:
            plan_exercise.exercise_name = exercise.name
            plan_exercise.muscle_group = exercise.muscle_group
            plan_exercise.category = exercise.category
    
    # Create export data structure
    export_data = {
        "name": plan.name,
        "description": plan.description,
        "days_per_week": plan.days_per_week,
        "duration_weeks": plan.duration_weeks,
        "is_public": plan.is_public,
        "exercises": []
    }
    
    # Add exercises to export data
    for ex in plan_exercises:
        export_data["exercises"].append({
            "exercise_id": ex.exercise_id,
            "exercise_name": getattr(ex, "exercise_name", None),
            "sets": ex.sets,
            "reps": ex.reps,
            "rest_seconds": ex.rest_seconds,
            "target_weight": ex.target_weight,
            "order": ex.order,
            "day_of_week": ex.day_of_week,
            "progression_type": ex.progression_type,
            "progression_value": ex.progression_value,
            "progression_threshold": ex.progression_threshold
        })
    
    # Return JSON response with appropriate headers for download
    return Response(
        content=json.dumps(export_data, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=workout_plan_{plan_id}.json"
        }
    )

@router.post("/import", response_model=WorkoutPlanResponse)
async def import_workout_plan(
    file: UploadFile = File(...),
    weight_unit: str = Form("kg"),  # Add weight_unit parameter with Form dependency
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import a workout plan from a JSON file.
    
    Parameters:
    - file: The JSON file containing workout plan data
    - weight_unit: The unit system used in the file ("kg" or "lbs")
    """
    # Read file contents
    try:
        contents = await file.read()
        plan_data = json.loads(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON file: {str(e)}"
        )
    
    # Validate required fields
    required_fields = ["name", "exercises"]
    for field in required_fields:
        if field not in plan_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )
    
    # Create new workout plan
    new_plan = WorkoutPlan(
        name=plan_data["name"],
        description=plan_data.get("description", ""),
        days_per_week=plan_data.get("days_per_week", 0),
        duration_weeks=plan_data.get("duration_weeks", 0),
        is_public=plan_data.get("is_public", False),
        owner_id=current_user.id
    )
    
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    
    # Add exercises to the plan
    for i, exercise_data in enumerate(plan_data["exercises"]):
        # Verify exercise exists if exercise_id is provided
        exercise_id = exercise_data.get("exercise_id")
        if exercise_id:
            exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
            if not exercise:
                # Try to find exercise by name if exercise_name is provided
                exercise_name = exercise_data.get("exercise_name")
                if exercise_name:
                    exercise = db.query(Exercise).filter(Exercise.name == exercise_name).first()
                
                # If still not found, skip this exercise or create a new one
                if not exercise:
                    # Could either skip or create a placeholder exercise
                    continue
                
                exercise_id = exercise.id
        else:
            # Skip exercises without an ID
            continue
        
        # Extract target weight and perform unit conversion if needed
        target_weight = exercise_data.get("target_weight", 0)
        
        # Get per-exercise weight unit if specified, otherwise use the form parameter
        ex_weight_unit = exercise_data.get("weight_unit", weight_unit)
        
        # Always convert to kg for storage in the database
        converted_weight = convert_weight(target_weight, ex_weight_unit, "kg")
        
        # Create plan exercise with converted weight
        db_plan_exercise = PlanExercise(
            workout_plan_id=new_plan.id,
            exercise_id=exercise_id,
            sets=exercise_data.get("sets", 3),
            reps=exercise_data.get("reps", 10),
            rest_seconds=exercise_data.get("rest_seconds", 60),
            target_weight=converted_weight,  # Use the converted weight
            order=exercise_data.get("order", i),
            day_of_week=exercise_data.get("day_of_week"),
            progression_type=exercise_data.get("progression_type", "weight"),
            progression_value=exercise_data.get("progression_value", 2.5),
            progression_threshold=exercise_data.get("progression_threshold", 2)
        )
        
        db.add(db_plan_exercise)
    
    db.commit()
    db.refresh(new_plan)
    
    return new_plan 