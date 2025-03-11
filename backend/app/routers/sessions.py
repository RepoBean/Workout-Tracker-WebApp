from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.models import (
    WorkoutSession, 
    SessionExercise, 
    ExerciseSet, 
    WorkoutPlan, 
    PlanExercise,
    Exercise,
    User
)
from app.schemas.workout_session import (
    WorkoutSessionCreate,
    WorkoutSessionUpdate,
    WorkoutSessionResponse,
    SessionExerciseCreate,
    SessionExerciseUpdate,
    SessionExerciseResponse,
    ExerciseSetCreate,
    ExerciseSetUpdate,
    ExerciseSetResponse
)
from app.services.auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=WorkoutSessionResponse)
async def create_workout_session(
    session: WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Start a new workout session.
    Optionally based on a workout plan.
    """
    # Check if workout plan exists if provided
    if session.workout_plan_id:
        workout_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == session.workout_plan_id).first()
        if not workout_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout plan not found"
            )
        
        # Check if user has access to this plan
        if workout_plan.owner_id != current_user.id and not workout_plan.is_public:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to use this workout plan"
            )
    
    # Create new workout session
    db_session = WorkoutSession(
        user_id=current_user.id,
        workout_plan_id=session.workout_plan_id,
        day_of_week=session.day_of_week,
        notes=session.notes,
        rating=session.rating
    )
    
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Add exercises if provided
    if session.exercises:
        for i, exercise_data in enumerate(session.exercises):
            # Verify exercise exists
            exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
            if not exercise:
                db.delete(db_session)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Exercise with id {exercise_data.exercise_id} not found"
                )
            
            # Create session exercise
            db_session_exercise = SessionExercise(
                session_id=db_session.id,
                exercise_id=exercise_data.exercise_id,
                sets_completed=exercise_data.sets_completed,
                order=exercise_data.order if exercise_data.order is not None else i,
                notes=exercise_data.notes
            )
            
            db.add(db_session_exercise)
            db.commit()
            db.refresh(db_session_exercise)
            
            # Add sets if provided
            if exercise_data.sets:
                for j, set_data in enumerate(exercise_data.sets):
                    db_set = ExerciseSet(
                        session_exercise_id=db_session_exercise.id,
                        reps=set_data.reps,
                        weight=set_data.weight,
                        set_number=set_data.set_number if set_data.set_number is not None else j + 1,
                        is_warmup=set_data.is_warmup,
                        perceived_effort=set_data.perceived_effort
                    )
                    
                    db.add(db_set)
                
                db.commit()
        
        db.refresh(db_session)
    
    # If based on a workout plan but no exercises provided, auto-populate from plan
    elif session.workout_plan_id and not session.exercises:
        plan_exercises = db.query(PlanExercise).filter(
            PlanExercise.workout_plan_id == session.workout_plan_id
        ).order_by(PlanExercise.order).all()
        
        for i, plan_exercise in enumerate(plan_exercises):
            db_session_exercise = SessionExercise(
                session_id=db_session.id,
                exercise_id=plan_exercise.exercise_id,
                sets_completed=0,  # Will be updated as user completes sets
                order=plan_exercise.order,
                notes=None
            )
            
            db.add(db_session_exercise)
            db.commit()
            db.refresh(db_session_exercise)
        
        db.refresh(db_session)
    
    return db_session

@router.get("", response_model=List[WorkoutSessionResponse])
async def get_workout_sessions(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    workout_plan_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all workout sessions for the current user.
    Can filter by date range and workout plan.
    """
    query = db.query(WorkoutSession).filter(WorkoutSession.user_id == current_user.id)
    
    # Apply filters if provided
    if start_date:
        query = query.filter(WorkoutSession.start_time >= start_date)
    if end_date:
        query = query.filter(WorkoutSession.start_time <= end_date)
    if workout_plan_id:
        query = query.filter(WorkoutSession.workout_plan_id == workout_plan_id)
    
    # Order by start time (newest first)
    query = query.order_by(desc(WorkoutSession.start_time))
    
    # Paginate results
    sessions = query.offset(skip).limit(limit).all()
    
    return sessions

@router.get("/{session_id}", response_model=WorkoutSessionResponse)
async def get_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific workout session by ID.
    """
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    return session

@router.patch("/{session_id}", response_model=WorkoutSessionResponse)
async def update_workout_session(
    session_id: int,
    session_update: WorkoutSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a workout session.
    Typically used to end a session or add notes/rating.
    """
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Update session fields
    if session_update.end_time is not None:
        db_session.end_time = session_update.end_time
    if session_update.notes is not None:
        db_session.notes = session_update.notes
    if session_update.rating is not None:
        db_session.rating = session_update.rating
    
    db.commit()
    db.refresh(db_session)
    
    return db_session

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a workout session.
    """
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Delete session (cascade will delete associated exercises and sets)
    db.delete(db_session)
    db.commit()
    
    return None

# Session Exercise Management

@router.post("/{session_id}/exercises", response_model=SessionExerciseResponse)
async def add_exercise_to_session(
    session_id: int,
    exercise: SessionExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add an exercise to a workout session.
    """
    # Check if session exists and user owns it
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
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
        max_order = db.query(SessionExercise).filter(
            SessionExercise.session_id == session_id
        ).order_by(desc(SessionExercise.order)).first()
        
        order = (max_order.order + 1) if max_order else 0
    else:
        order = exercise.order
    
    # Create new session exercise
    db_session_exercise = SessionExercise(
        session_id=session_id,
        exercise_id=exercise.exercise_id,
        sets_completed=exercise.sets_completed,
        order=order,
        notes=exercise.notes
    )
    
    db.add(db_session_exercise)
    db.commit()
    db.refresh(db_session_exercise)
    
    # Add sets if provided
    if exercise.sets:
        for i, set_data in enumerate(exercise.sets):
            db_set = ExerciseSet(
                session_exercise_id=db_session_exercise.id,
                reps=set_data.reps,
                weight=set_data.weight,
                set_number=set_data.set_number if set_data.set_number is not None else i + 1,
                is_warmup=set_data.is_warmup,
                perceived_effort=set_data.perceived_effort
            )
            
            db.add(db_set)
        
        db.commit()
        db.refresh(db_session_exercise)
    
    return db_session_exercise

@router.put("/{session_id}/exercises/{exercise_id}", response_model=SessionExerciseResponse)
async def update_session_exercise(
    session_id: int,
    exercise_id: int,
    exercise_update: SessionExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an exercise in a workout session.
    """
    # Check if session exists and user owns it
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Get the session exercise
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this workout session"
        )
    
    # Update exercise fields
    if exercise_update.sets_completed is not None:
        db_session_exercise.sets_completed = exercise_update.sets_completed
    if exercise_update.notes is not None:
        db_session_exercise.notes = exercise_update.notes
    
    db.commit()
    db.refresh(db_session_exercise)
    
    return db_session_exercise

@router.delete("/{session_id}/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exercise_from_session(
    session_id: int,
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove an exercise from a workout session.
    """
    # Check if session exists and user owns it
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Get the session exercise
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this workout session"
        )
    
    # Delete the session exercise (cascade will delete associated sets)
    db.delete(db_session_exercise)
    db.commit()
    
    return None

# Exercise Set Management

@router.post("/{session_id}/exercises/{exercise_id}/sets", response_model=ExerciseSetResponse)
async def add_set_to_exercise(
    session_id: int,
    exercise_id: int,
    set_data: ExerciseSetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a set to an exercise in a workout session.
    """
    # Check if session exists and user owns it
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Get the session exercise
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this workout session"
        )
    
    # Determine set number if not provided
    if set_data.set_number is None:
        # Get highest set number and add 1
        max_set = db.query(ExerciseSet).filter(
            ExerciseSet.session_exercise_id == exercise_id
        ).order_by(desc(ExerciseSet.set_number)).first()
        
        set_number = (max_set.set_number + 1) if max_set else 1
    else:
        set_number = set_data.set_number
    
    # Create new exercise set
    db_set = ExerciseSet(
        session_exercise_id=exercise_id,
        reps=set_data.reps,
        weight=set_data.weight,
        set_number=set_number,
        is_warmup=set_data.is_warmup,
        perceived_effort=set_data.perceived_effort
    )
    
    db.add(db_set)
    
    # Update sets_completed count
    if not set_data.is_warmup:
        db_session_exercise.sets_completed += 1
    
    db.commit()
    db.refresh(db_set)
    
    return db_set

@router.put("/{session_id}/exercises/{exercise_id}/sets/{set_id}", response_model=ExerciseSetResponse)
async def update_exercise_set(
    session_id: int,
    exercise_id: int,
    set_id: int,
    set_update: ExerciseSetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a set in an exercise.
    """
    # Check if session exists and user owns it
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Get the session exercise
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this workout session"
        )
    
    # Get the exercise set
    db_set = db.query(ExerciseSet).filter(
        ExerciseSet.id == set_id,
        ExerciseSet.session_exercise_id == exercise_id
    ).first()
    
    if not db_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set not found for this exercise"
        )
    
    # Check if warmup status is changing
    was_warmup = db_set.is_warmup
    will_be_warmup = set_update.is_warmup if set_update.is_warmup is not None else was_warmup
    
    # Update set fields
    if set_update.reps is not None:
        db_set.reps = set_update.reps
    if set_update.weight is not None:
        db_set.weight = set_update.weight
    if set_update.is_warmup is not None:
        db_set.is_warmup = set_update.is_warmup
    if set_update.perceived_effort is not None:
        db_set.perceived_effort = set_update.perceived_effort
    
    # Update sets_completed count if warmup status changed
    if was_warmup and not will_be_warmup:
        db_session_exercise.sets_completed += 1
    elif not was_warmup and will_be_warmup:
        db_session_exercise.sets_completed -= 1
    
    db.commit()
    db.refresh(db_set)
    
    return db_set

@router.delete("/{session_id}/exercises/{exercise_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise_set(
    session_id: int,
    exercise_id: int,
    set_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a set from an exercise.
    """
    # Check if session exists and user owns it
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Get the session exercise
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this workout session"
        )
    
    # Get the exercise set
    db_set = db.query(ExerciseSet).filter(
        ExerciseSet.id == set_id,
        ExerciseSet.session_exercise_id == exercise_id
    ).first()
    
    if not db_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set not found for this exercise"
        )
    
    # Update sets_completed count if not a warmup set
    if not db_set.is_warmup:
        db_session_exercise.sets_completed -= 1
    
    # Delete the set
    db.delete(db_set)
    db.commit()
    
    return None

@router.post("/{session_id}/end", response_model=WorkoutSessionResponse)
async def end_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    End a workout session by setting the end_time to now.
    """
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )
    
    # Set end time to now
    db_session.end_time = func.now()
    
    db.commit()
    db.refresh(db_session)
    
    return db_session 