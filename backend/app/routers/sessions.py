from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
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
    User,
    UserProgramProgress
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
        
        # Check for an existing in-progress session with the same plan and day
        # to prevent duplicate entries
        if session.day_of_week:
            existing_session = db.query(WorkoutSession).filter(
                WorkoutSession.user_id == current_user.id,
                WorkoutSession.workout_plan_id == session.workout_plan_id,
                WorkoutSession.day_of_week == session.day_of_week,
                WorkoutSession.status == "in_progress",
                WorkoutSession.end_time.is_(None)  # Session hasn't ended
            ).first()
            
            if existing_session:
                # We need to load exercises explicitly since we're returning existing session
                existing_session = db.query(WorkoutSession).options(
                    joinedload(WorkoutSession.exercises).joinedload(SessionExercise.exercise)
                ).filter(
                    WorkoutSession.id == existing_session.id
                ).first()
                
                # Return the existing session instead of creating a new one
                # This prevents duplicate entries
                return existing_session
    
    # Create new workout session
    db_session = WorkoutSession(
        user_id=current_user.id,
        workout_plan_id=session.workout_plan_id,
        day_of_week=session.day_of_week,
        notes=session.notes,
        rating=session.rating,
        status=session.status or "in_progress",
        start_time=session.start_time or func.now()  # Ensure start_time is provided
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
                notes=exercise_data.notes,
                # We are NOT setting weight/reps here as they come from UserProgramProgress
                # We might need to decide how manually added exercises interact with progress
            )
            db.add(db_session_exercise)
            # Commit and refresh removed from here to bulk add later

            # Add sets if provided
            if exercise_data.sets:
                sets_to_add = []
                for j, set_data in enumerate(exercise_data.sets):
                    db_set = ExerciseSet(
                        session_exercise_id=db_session_exercise.id, # Need ID first
                        reps=set_data.reps,
                        weight=set_data.weight, # Manual weight for this set
                        set_number=set_data.set_number if set_data.set_number is not None else j + 1,
                        is_warmup=set_data.is_warmup,
                        perceived_effort=set_data.perceived_effort
                    )
                    sets_to_add.append(db_set)
                # Commit needs db_session_exercise.id, so commit exercise first
                db.commit()
                db.refresh(db_session_exercise)
                # Now add sets
                db.add_all(sets_to_add)
                db.commit()

        db.refresh(db_session)
    
    # If based on a workout plan but no exercises provided, auto-populate from plan
    elif session.workout_plan_id and not session.exercises:
        # Base query for plan exercises
        plan_exercises_query = db.query(PlanExercise).filter(
            PlanExercise.workout_plan_id == session.workout_plan_id
        )
        
        # If day_of_week is provided, filter exercises by that day
        if session.day_of_week:
            plan_exercises_query = plan_exercises_query.filter(
                PlanExercise.day_of_week == session.day_of_week
            )
        
        # Get exercises in order
        plan_exercises = plan_exercises_query.order_by(PlanExercise.order).all()
        
        # If no exercises found with the day filter, log a warning
        if not plan_exercises and session.day_of_week:
            print(f"Warning: No exercises found for plan {session.workout_plan_id} on day {session.day_of_week}")
        
        session_exercises_to_add = []
        progress_records_to_add = []

        for i, plan_exercise in enumerate(plan_exercises):
            exercise = db.query(Exercise).filter(Exercise.id == plan_exercise.exercise_id).first()
            if not exercise:
                print(f"WARNING: Exercise with id {plan_exercise.exercise_id} not found in database")
                continue

            # Find or create user progress record
            user_progress = db.query(UserProgramProgress).filter_by(
                user_id=current_user.id,
                workout_plan_id=session.workout_plan_id,
                exercise_id=plan_exercise.exercise_id
            ).first()

            if not user_progress:
                user_progress = UserProgramProgress(
                    user_id=current_user.id,
                    workout_plan_id=session.workout_plan_id,
                    exercise_id=plan_exercise.exercise_id,
                    current_weight=None,  # Initial weight should be set by user via frontend
                    current_reps=plan_exercise.reps, # Initial reps from plan
                    progression_status=0
                )
                progress_records_to_add.append(user_progress)

            # Create the session exercise WITHOUT target weight/reps
            db_session_exercise = SessionExercise(
                session_id=db_session.id,
                exercise_id=plan_exercise.exercise_id,
                sets_completed=0,
                order=plan_exercise.order,
                notes=None,
                # target_weight=plan_exercise.target_weight, # Removed
                # target_reps=plan_exercise.reps, # Removed
                rest_seconds=plan_exercise.rest_seconds,
                sets_count=plan_exercise.sets
            )
            session_exercises_to_add.append(db_session_exercise)

        # Add all new session exercises and progress records
        db.add_all(session_exercises_to_add)
        db.add_all(progress_records_to_add)
        db.commit()
        db.refresh(db_session)
    
    # Reload the session with all relationships to ensure proper response
    created_session = db.query(WorkoutSession).options(
        joinedload(WorkoutSession.exercises).joinedload(SessionExercise.exercise),
        joinedload(WorkoutSession.exercises).joinedload(SessionExercise.sets) # Eager load sets too
    ).filter(
        WorkoutSession.id == db_session.id
    ).first()
    
    # Manually populate response fields from UserProgramProgress if session is plan-based
    if created_session and created_session.workout_plan_id and created_session.exercises:
        for sess_ex in created_session.exercises:
            user_progress = db.query(UserProgramProgress).filter_by(
                user_id=current_user.id,
                workout_plan_id=created_session.workout_plan_id,
                exercise_id=sess_ex.exercise_id
            ).first()
            if user_progress:
                # Assign attributes to the SessionExercise instance before serialization
                sess_ex.current_weight = user_progress.current_weight
                sess_ex.current_reps = user_progress.current_reps
            else:
                 # Should not happen if created correctly, but handle defensively
                 sess_ex.current_weight = None
                 sess_ex.current_reps = None

    return created_session

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
    # Use joinedload to efficiently load related Exercise objects
    query = db.query(WorkoutSession).options(
        joinedload(WorkoutSession.exercises).joinedload(SessionExercise.exercise)
    ).filter(WorkoutSession.user_id == current_user.id)
    
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
    Get a specific workout session by ID, including user progress data.
    """
    # Eager load exercises, their associated exercise definition, and sets
    db_session = db.query(WorkoutSession).options(
        joinedload(WorkoutSession.exercises).joinedload(SessionExercise.exercise),
        joinedload(WorkoutSession.exercises).joinedload(SessionExercise.sets)
    ).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    # Manually populate response fields from UserProgramProgress if session is plan-based
    if db_session.workout_plan_id and db_session.exercises:
        for sess_ex in db_session.exercises:
            user_progress = db.query(UserProgramProgress).filter_by(
                user_id=current_user.id,
                workout_plan_id=db_session.workout_plan_id,
                exercise_id=sess_ex.exercise_id
            ).first()
            if user_progress:
                # Assign attributes to the SessionExercise instance before serialization
                sess_ex.current_weight = user_progress.current_weight
                sess_ex.current_reps = user_progress.current_reps
            else:
                 # Handle case where progress might be missing (e.g., plan modified)
                 sess_ex.current_weight = None
                 sess_ex.current_reps = None

    return db_session

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
    if session_update.status is not None:
        db_session.status = session_update.status
        # If status is set to completed and end_time is not set, set it to now
        if session_update.status == "completed" and not db_session.end_time:
            db_session.end_time = func.now()
    
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

@router.get("/plan/{plan_id}", response_model=List[WorkoutSessionResponse])
async def get_sessions_by_plan(
    plan_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all workout sessions for a specific workout plan,
    optionally filtered by status
    """
    # Check if plan exists and user has access
    workout_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    if not workout_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    
    # Check access permissions
    if workout_plan.owner_id != current_user.id and not workout_plan.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this workout plan"
        )
    
    # Use joinedload to efficiently load related Exercise objects
    query = db.query(WorkoutSession).options(
        joinedload(WorkoutSession.exercises).joinedload(SessionExercise.exercise)
    ).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.workout_plan_id == plan_id
    )
    
    # Apply status filter if provided
    if status:
        query = query.filter(WorkoutSession.status == status)
    
    # Order by start time (newest first)
    query = query.order_by(desc(WorkoutSession.start_time))
    
    sessions = query.all()
    return sessions

# Session Exercise Management

@router.post("/{session_id}/exercises", response_model=SessionExerciseResponse)
async def add_exercise_to_session(
    session_id: int,
    exercise: SessionExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add an exercise to an ongoing workout session.
    If the session is linked to a plan, it fetches details from UserProgramProgress.
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

    if db_session.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add exercises to a completed session"
        )

    # Verify exercise exists
    db_exercise = db.query(Exercise).filter(Exercise.id == exercise.exercise_id).first()
    if not db_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercise with id {exercise.exercise_id} not found"
        )

    # Determine order for the new exercise
    max_order = db.query(func.max(SessionExercise.order)).filter(
        SessionExercise.session_id == session_id
    ).scalar()
    order = (max_order or 0) + 1

    # Initialize variables from plan/progress
    rest_seconds = None
    sets_count = None
    user_progress = None

    # If session is linked to a plan, get PlanExercise and UserProgramProgress details
    if db_session.workout_plan_id:
        plan_exercise_query = db.query(PlanExercise).filter(
            PlanExercise.workout_plan_id == db_session.workout_plan_id,
            PlanExercise.exercise_id == exercise.exercise_id
        )

        # Filter by day_of_week if available in the session
        if db_session.day_of_week:
            plan_exercise_query = plan_exercise_query.filter(
                PlanExercise.day_of_week == db_session.day_of_week
            )

        plan_exercise = plan_exercise_query.first()

        if plan_exercise:
            rest_seconds = plan_exercise.rest_seconds
            sets_count = plan_exercise.sets

            # Find or create user progress record
            user_progress = db.query(UserProgramProgress).filter_by(
                user_id=current_user.id,
                workout_plan_id=db_session.workout_plan_id,
                exercise_id=plan_exercise.exercise_id
            ).first()

            if not user_progress:
                user_progress = UserProgramProgress(
                    user_id=current_user.id,
                    workout_plan_id=db_session.workout_plan_id,
                    exercise_id=plan_exercise.exercise_id,
                    current_weight=None, # Needs to be set by user
                    current_reps=plan_exercise.reps, # Initial reps from plan
                    progression_status=0
                )
                db.add(user_progress)
                # Commit progress immediately so it's available for the response
                db.commit()
                db.refresh(user_progress)

    # Create new session exercise
    db_session_exercise = SessionExercise(
        session_id=session_id,
        exercise_id=exercise.exercise_id,
        sets_completed=exercise.sets_completed,
        order=order,
        notes=exercise.notes,
        # target_weight and target_reps are removed from here
        rest_seconds=rest_seconds, # Get from plan_exercise if available
        sets_count=sets_count # Get from plan_exercise if available
    )

    db.add(db_session_exercise)
    db.commit()
    db.refresh(db_session_exercise) # Refresh to get the ID

    # Add sets if provided
    if exercise.sets:
        sets_to_add = []
        for i, set_data in enumerate(exercise.sets):
            db_set = ExerciseSet(
                session_exercise_id=db_session_exercise.id,
                reps=set_data.reps,
                weight=set_data.weight,
                set_number=set_data.set_number if set_data.set_number is not None else i + 1,
                is_warmup=set_data.is_warmup,
                perceived_effort=set_data.perceived_effort
            )
            sets_to_add.append(db_set)
        db.add_all(sets_to_add)
        db.commit()
        db.refresh(db_session_exercise) # Refresh again to potentially load sets relationship

    # Reload the session exercise with exercise relationship for the response
    # And manually add progress data for the response schema
    session_exercise_response = db.query(SessionExercise).options(
        joinedload(SessionExercise.exercise),
        joinedload(SessionExercise.sets)
    ).filter(
        SessionExercise.id == db_session_exercise.id
    ).first()

    # Populate progress fields for the response
    if user_progress:
        session_exercise_response.current_weight = user_progress.current_weight
        session_exercise_response.current_reps = user_progress.current_reps
    else:
        # If not plan based or no progress found (shouldn't happen if created above)
        session_exercise_response.current_weight = None
        session_exercise_response.current_reps = None

    return session_exercise_response

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
    Mark a workout session as completed and apply progression logic.
    """
    db_session = db.query(WorkoutSession).options(
        joinedload(WorkoutSession.exercises)
        .joinedload(SessionExercise.sets) # Eager load sets for progression check
    ).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    if db_session.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workout session already ended"
        )

    # Update session status and end time
    db_session.end_time = func.now()
    db_session.status = "completed"

    # Apply progression logic if the session is linked to a plan
    if db_session.workout_plan_id:
        progress_updates = [] # Collect progress records to update

        for sess_ex in db_session.exercises:
            # Find the corresponding PlanExercise for progression rules
            plan_exercise_query = db.query(PlanExercise).filter(
                PlanExercise.workout_plan_id == db_session.workout_plan_id,
                PlanExercise.exercise_id == sess_ex.exercise_id
            )
            if db_session.day_of_week:
                plan_exercise_query = plan_exercise_query.filter(
                    PlanExercise.day_of_week == db_session.day_of_week
                )
            plan_exercise = plan_exercise_query.first()

            # Find the UserProgramProgress record
            user_progress = db.query(UserProgramProgress).filter_by(
                user_id=current_user.id,
                workout_plan_id=db_session.workout_plan_id,
                exercise_id=sess_ex.exercise_id
            ).first()

            if not plan_exercise or not user_progress:
                print(f"Skipping progression for exercise {sess_ex.exercise_id}: Missing plan or progress data.")
                continue # Skip if plan exercise or progress data is missing

            # --- Progression Check Logic --- 
            # Define success criteria (adjust as needed)
            # Assumption: Success = completed all target sets (sets_count) 
            #             with at least the target reps (current_reps) 
            #             using the target weight (current_weight)
            target_sets = sess_ex.sets_count or plan_exercise.sets
            target_reps = user_progress.current_reps or plan_exercise.reps
            target_weight = user_progress.current_weight # Weight must match exactly if set
            
            completed_sets_count = 0
            successful_sets_count = 0
            actual_sets = [s for s in sess_ex.sets if not s.is_warmup] # Exclude warmups
            
            for actual_set in actual_sets:
                completed_sets_count += 1
                set_successful = True
                # Check reps
                if actual_set.reps < target_reps:
                    set_successful = False
                # Check weight if target weight is defined
                if target_weight is not None and actual_set.weight != target_weight:
                    set_successful = False
                    
                if set_successful:
                    successful_sets_count += 1

            # Check if all target sets were completed successfully
            was_successful_this_session = (completed_sets_count >= target_sets and 
                                           successful_sets_count >= target_sets)

            if was_successful_this_session:
                user_progress.progression_status += 1
                print(f"Progression status for exercise {sess_ex.exercise_id} increased to {user_progress.progression_status}")

                # Check if threshold is met
                if plan_exercise.progression_threshold and user_progress.progression_status >= plan_exercise.progression_threshold:
                    print(f"Progression threshold met for exercise {sess_ex.exercise_id}!")
                    prog_type = plan_exercise.progression_type
                    prog_value = plan_exercise.progression_value or 0
                    next_weight = user_progress.current_weight
                    next_reps = user_progress.current_reps

                    if prog_type == "weight":
                        next_weight = (next_weight or 0) + prog_value
                    elif prog_type == "reps":
                        next_reps = (next_reps or 0) + int(prog_value) # Assume whole number for reps
                    # Add more complex progression types later (e.g., weight_then_reps)
                    
                    # Update the user's progress for the *next* session
                    user_progress.next_weight = next_weight
                    user_progress.next_reps = next_reps
                    user_progress.current_weight = next_weight # Update current for next time
                    user_progress.current_reps = next_reps   # Update current for next time
                    user_progress.progression_status = 0 # Reset status
                    print(f"  - New target for next session: Weight={next_weight}, Reps={next_reps}")
            else:
                # Optional: Reset progression status if session was not successful?
                # user_progress.progression_status = 0 
                print(f"Progression status not increased for exercise {sess_ex.exercise_id}")
                # Ensure next weight/reps are reset if progression wasn't made
                user_progress.next_weight = user_progress.current_weight
                user_progress.next_reps = user_progress.current_reps

            progress_updates.append(user_progress)

    # Commit session end time and all progress updates
    db.commit()
    db.refresh(db_session) # Refresh to get updated end_time

    # Reload session with relationships for the response, including progress
    updated_session = db.query(WorkoutSession).options(
        joinedload(WorkoutSession.exercises).joinedload(SessionExercise.exercise),
        joinedload(WorkoutSession.exercises).joinedload(SessionExercise.sets)
    ).filter(
        WorkoutSession.id == db_session.id
    ).first()

    # Manually populate response fields from UserProgramProgress
    if updated_session and updated_session.workout_plan_id and updated_session.exercises:
        for sess_ex in updated_session.exercises:
            user_progress = db.query(UserProgramProgress).filter_by(
                user_id=current_user.id,
                workout_plan_id=updated_session.workout_plan_id,
                exercise_id=sess_ex.exercise_id
            ).first()
            if user_progress:
                sess_ex.current_weight = user_progress.current_weight
                sess_ex.current_reps = user_progress.current_reps
            else:
                sess_ex.current_weight = None
                sess_ex.current_reps = None

    return updated_session 