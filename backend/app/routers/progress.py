from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from app.database import get_db
from app.models.models import (
    User, 
    Exercise, 
    WorkoutSession, 
    SessionExercise, 
    ExerciseSet,
    UserProgramProgress,
    WorkoutPlan,
    PlanExercise
)
from app.services.auth import get_current_active_user
from app.schemas.user_progress import (
    UserProgressBatchUpdatePayload,
    UserProgressBatchUpdateResponse,
    UserProgressUpdateItem,
    UserProgressResponseItem
)

router = APIRouter(
    prefix="/progress",
    tags=["progress"]
)

@router.get("/exercises/{exercise_id}")
async def get_exercise_progress(
    exercise_id: int,
    time_period: Optional[str] = Query("all", enum=["week", "month", "3months", "6months", "year", "all"]),
    metric: Optional[str] = Query("weight", enum=["weight", "volume", "reps"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get progress data for a specific exercise.
    Time period can be: week, month, 3months, 6months, year, all.
    Metric can be: weight (max weight), volume (weight * reps), reps (max reps).
    """
    # Check if exercise exists
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    # Calculate start date based on time period
    start_date = None
    if time_period != "all":
        now = datetime.utcnow()
        if time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)
        elif time_period == "3months":
            start_date = now - timedelta(days=90)
        elif time_period == "6months":
            start_date = now - timedelta(days=180)
        elif time_period == "year":
            start_date = now - timedelta(days=365)
    
    # Build query to get all sets for this exercise by the current user
    query = (
        db.query(
            WorkoutSession.start_time,
            ExerciseSet.weight,
            ExerciseSet.reps,
            ExerciseSet.is_warmup
        )
        .join(SessionExercise, WorkoutSession.id == SessionExercise.session_id)
        .join(ExerciseSet, SessionExercise.id == ExerciseSet.session_exercise_id)
        .filter(
            WorkoutSession.user_id == current_user.id,
            SessionExercise.exercise_id == exercise_id,
            ExerciseSet.is_warmup == False  # Exclude warmup sets
        )
    )
    
    # Apply time period filter if specified
    if start_date:
        query = query.filter(WorkoutSession.start_time >= start_date)
    
    # Order by date
    query = query.order_by(WorkoutSession.start_time)
    
    # Execute query
    results = query.all()
    
    # Process results based on metric
    data_points = []
    
    # Group by date (day)
    date_groups = {}
    for result in results:
        date_key = result.start_time.date().isoformat()
        if date_key not in date_groups:
            date_groups[date_key] = []
        
        date_groups[date_key].append({
            "weight": result.weight or 0,
            "reps": result.reps,
            "volume": (result.weight or 0) * result.reps
        })
    
    # Calculate metric for each date
    for date, sets in date_groups.items():
        if metric == "weight":
            # Max weight
            value = max([s["weight"] for s in sets]) if sets else 0
        elif metric == "volume":
            # Max volume in a single set
            value = max([s["volume"] for s in sets]) if sets else 0
        elif metric == "reps":
            # Max reps
            value = max([s["reps"] for s in sets]) if sets else 0
        
        data_points.append({
            "date": date,
            "value": value
        })
    
    # Calculate personal records
    personal_records = {
        "max_weight": max([s["weight"] for group in date_groups.values() for s in group]) if results else 0,
        "max_reps": max([s["reps"] for group in date_groups.values() for s in group]) if results else 0,
        "max_volume": max([s["volume"] for group in date_groups.values() for s in group]) if results else 0,
        "max_volume_session": sum([s["volume"] for s in max(date_groups.values(), key=lambda x: sum(s["volume"] for s in x))]) if date_groups else 0
    }
    
    return {
        "exercise": {
            "id": exercise.id,
            "name": exercise.name
        },
        "metric": metric,
        "time_period": time_period,
        "data": data_points,
        "personal_records": personal_records
    }

@router.get("/volume")
async def get_volume_progress(
    time_period: Optional[str] = Query("month", enum=["week", "month", "3months", "6months", "year", "all"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get total workout volume progress over time.
    Time period can be: week, month, 3months, 6months, year, all.
    """
    # Calculate start date based on time period
    start_date = None
    if time_period != "all":
        now = datetime.utcnow()
        if time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)
        elif time_period == "3months":
            start_date = now - timedelta(days=90)
        elif time_period == "6months":
            start_date = now - timedelta(days=180)
        elif time_period == "year":
            start_date = now - timedelta(days=365)
    
    # Build query to get all sets by the current user
    query = (
        db.query(
            func.date(WorkoutSession.start_time).label("date"),
            func.sum(ExerciseSet.weight * ExerciseSet.reps).label("volume")
        )
        .join(SessionExercise, WorkoutSession.id == SessionExercise.session_id)
        .join(ExerciseSet, SessionExercise.id == ExerciseSet.session_exercise_id)
        .filter(
            WorkoutSession.user_id == current_user.id,
            ExerciseSet.is_warmup == False  # Exclude warmup sets
        )
        .group_by(func.date(WorkoutSession.start_time))
    )
    
    # Apply time period filter if specified
    if start_date:
        query = query.filter(WorkoutSession.start_time >= start_date)
    
    # Order by date
    query = query.order_by(func.date(WorkoutSession.start_time))
    
    # Execute query
    results = query.all()
    
    # Process results
    data_points = [
        {
            "date": result.date.isoformat(),
            "volume": float(result.volume) if result.volume else 0
        }
        for result in results
    ]
    
    return {
        "metric": "volume",
        "time_period": time_period,
        "data": data_points
    }

@router.get("/frequency")
async def get_workout_frequency(
    time_period: Optional[str] = Query("month", enum=["week", "month", "3months", "6months", "year", "all"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get workout frequency data.
    Time period can be: week, month, 3months, 6months, year, all.
    """
    # Calculate start date based on time period
    start_date = None
    if time_period != "all":
        now = datetime.utcnow()
        if time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)
        elif time_period == "3months":
            start_date = now - timedelta(days=90)
        elif time_period == "6months":
            start_date = now - timedelta(days=180)
        elif time_period == "year":
            start_date = now - timedelta(days=365)
    
    # Build query to count workout sessions by date
    query = (
        db.query(
            func.date(WorkoutSession.start_time).label("date"),
            func.count(WorkoutSession.id).label("count")
        )
        .filter(WorkoutSession.user_id == current_user.id)
        .group_by(func.date(WorkoutSession.start_time))
    )
    
    # Apply time period filter if specified
    if start_date:
        query = query.filter(WorkoutSession.start_time >= start_date)
    
    # Order by date
    query = query.order_by(func.date(WorkoutSession.start_time))
    
    # Execute query
    results = query.all()
    
    # Process results
    data_points = [
        {
            "date": result.date.isoformat(),
            "count": result.count
        }
        for result in results
    ]
    
    # Calculate statistics
    total_workouts = sum(point["count"] for point in data_points)
    
    # Calculate days in period
    days_in_period = 0
    if time_period == "week":
        days_in_period = 7
    elif time_period == "month":
        days_in_period = 30
    elif time_period == "3months":
        days_in_period = 90
    elif time_period == "6months":
        days_in_period = 180
    elif time_period == "year":
        days_in_period = 365
    else:  # all
        if data_points:
            first_date = datetime.fromisoformat(data_points[0]["date"])
            last_date = datetime.fromisoformat(data_points[-1]["date"])
            days_in_period = (last_date - first_date).days + 1
        else:
            days_in_period = 1
    
    # Calculate average workouts per week
    avg_per_week = (total_workouts / days_in_period) * 7 if days_in_period > 0 else 0
    
    return {
        "metric": "frequency",
        "time_period": time_period,
        "data": data_points,
        "statistics": {
            "total_workouts": total_workouts,
            "days_in_period": days_in_period,
            "avg_workouts_per_week": round(avg_per_week, 2)
        }
    }

@router.get("/records")
async def get_personal_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get personal records for all exercises the user has performed.
    """
    # Get all exercises user has performed
    performed_exercises = (
        db.query(Exercise)
        .join(SessionExercise, Exercise.id == SessionExercise.exercise_id)
        .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
        .filter(WorkoutSession.user_id == current_user.id)
        .distinct()
    ).all()
    
    records = []
    
    for exercise in performed_exercises:
        # Query for max weight set for this exercise
        max_weight_set = (
            db.query(ExerciseSet)
            .join(SessionExercise, ExerciseSet.session_exercise_id == SessionExercise.id)
            .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
            .filter(
                WorkoutSession.user_id == current_user.id,
                SessionExercise.exercise_id == exercise.id,
                ExerciseSet.is_warmup == False
            )
            .order_by(desc(ExerciseSet.weight))
            .first()
        )
        
        # Query for max reps set for this exercise
        max_reps_set = (
            db.query(ExerciseSet)
            .join(SessionExercise, ExerciseSet.session_exercise_id == SessionExercise.id)
            .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
            .filter(
                WorkoutSession.user_id == current_user.id,
                SessionExercise.exercise_id == exercise.id,
                ExerciseSet.is_warmup == False
            )
            .order_by(desc(ExerciseSet.reps))
            .first()
        )
        
        if max_weight_set or max_reps_set:
            # Get session dates
            max_weight_date = None
            if max_weight_set:
                max_weight_session = (
                    db.query(WorkoutSession)
                    .join(SessionExercise, WorkoutSession.id == SessionExercise.session_id)
                    .filter(
                        SessionExercise.id == max_weight_set.session_exercise_id
                    )
                    .first()
                )
                max_weight_date = max_weight_session.start_time if max_weight_session else None
            
            max_reps_date = None
            if max_reps_set:
                max_reps_session = (
                    db.query(WorkoutSession)
                    .join(SessionExercise, WorkoutSession.id == SessionExercise.session_id)
                    .filter(
                        SessionExercise.id == max_reps_set.session_exercise_id
                    )
                    .first()
                )
                max_reps_date = max_reps_session.start_time if max_reps_session else None
            
            records.append({
                "exercise": {
                    "id": exercise.id,
                    "name": exercise.name,
                    "category": exercise.category
                },
                "max_weight": {
                    "weight": max_weight_set.weight if max_weight_set else 0,
                    "reps": max_weight_set.reps if max_weight_set else 0,
                    "date": max_weight_date.isoformat() if max_weight_date else None
                },
                "max_reps": {
                    "weight": max_reps_set.weight if max_reps_set else 0,
                    "reps": max_reps_set.reps if max_reps_set else 0,
                    "date": max_reps_date.isoformat() if max_reps_date else None
                }
            })
    
    return records

@router.get("/summary")
async def get_workout_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a summary of recent workout activity and stats.
    """
    now = datetime.utcnow()
    start_of_week = now - timedelta(days=now.weekday())
    start_of_month = now.replace(day=1)

    # Total workouts this week
    workouts_this_week = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.start_time >= start_of_week,
        WorkoutSession.status == 'completed'
    ).count()

    # Total workouts this month
    workouts_this_month = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.start_time >= start_of_month,
        WorkoutSession.status == 'completed'
    ).count()

    # Total volume this week (approximate)
    volume_this_week = db.query(func.sum(ExerciseSet.weight * ExerciseSet.reps)).join(
        SessionExercise, ExerciseSet.session_exercise_id == SessionExercise.id
    ).join(
        WorkoutSession, SessionExercise.session_id == WorkoutSession.id
    ).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.start_time >= start_of_week,
        WorkoutSession.status == 'completed',
        ExerciseSet.is_warmup == False,
        ExerciseSet.weight != None
    ).scalar() or 0

    # Recent Sessions (last 5)
    recent_sessions = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id
    ).order_by(desc(WorkoutSession.start_time)).limit(5).all()

    return {
        "workouts_this_week": workouts_this_week,
        "workouts_this_month": workouts_this_month,
        "volume_this_week": float(volume_this_week),
        "recent_sessions": recent_sessions # Consider creating a simpler response schema here
    }

@router.post("/batch-update", response_model=UserProgressBatchUpdateResponse)
async def batch_update_user_progress(
    payload: UserProgressBatchUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Updates multiple UserProgramProgress records for the current user 
    based on a workout plan ID and a list of exercise updates.
    Primarily used to set initial weights when starting a plan.
    """
    # Determine which plan ID to use (support both field names for backwards compatibility)
    workout_plan_id = payload.workout_plan_id
    if workout_plan_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                           detail="workout_plan_id must be provided")

    # Check if plan exists first
    plan = db.query(WorkoutPlan).filter_by(id=workout_plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                           detail=f"Workout plan with ID {workout_plan_id} not found")

    # Check if user has access to this plan
    if plan.owner_id != current_user.id and not plan.is_public:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                           detail="You don't have access to this workout plan")

    updated_count = 0
    not_found_exercises = []
    failed_updates = []
    
    # Map of exercise IDs to updates for easier lookup
    exercise_updates = {item.exercise_id: item for item in payload.updates}
    exercise_ids = list(exercise_updates.keys())
    
    # First, get ALL existing records for these exercises
    existing_records = db.query(UserProgramProgress).filter(
        UserProgramProgress.user_id == current_user.id,
        UserProgramProgress.workout_plan_id == workout_plan_id,
        UserProgramProgress.exercise_id.in_(exercise_ids)
    ).all()
    
    # Map existing records by exercise_id for easier lookup
    existing_records_map = {record.exercise_id: record for record in existing_records}
    
    # Identify exercises that need new records
    missing_exercise_ids = [
        exercise_id for exercise_id in exercise_ids 
        if exercise_id not in existing_records_map
    ]
    
    # Create records for missing exercises
    if missing_exercise_ids:
        # Fetch plan exercise details for these exercises
        plan_exercises = db.query(PlanExercise).filter(
            PlanExercise.workout_plan_id == workout_plan_id,
            PlanExercise.exercise_id.in_(missing_exercise_ids)
        ).all()
        
        # Map plan exercises by exercise_id
        plan_exercises_map = {pe.exercise_id: pe for pe in plan_exercises}
        
        # Create missing records one by one with error handling
        for exercise_id in missing_exercise_ids:
            try:
                # Get update item
                update_item = exercise_updates[exercise_id]
                
                # Get plan exercise for default reps if available
                plan_exercise = plan_exercises_map.get(exercise_id)
                target_reps = plan_exercise.reps if plan_exercise else None
                
                # Create new record
                new_progress = UserProgramProgress(
                    user_id=current_user.id,
                    workout_plan_id=workout_plan_id,
                    exercise_id=exercise_id,
                    current_weight=update_item.current_weight,
                    current_reps=update_item.current_reps or target_reps,
                    next_weight=update_item.current_weight,  # Initialize next_weight with current_weight
                    next_reps=update_item.current_reps or target_reps,
                    progression_status=0
                )
                
                db.add(new_progress)
                try:
                    db.flush()  # Try to flush each record individually
                    updated_count += 1
                except Exception as e:
                    db.rollback()
                    print(f"Error creating progress record for exercise {exercise_id}: {str(e)}")
                    failed_updates.append(exercise_id)
                    continue
            except Exception as e:
                print(f"Error processing exercise {exercise_id}: {str(e)}")
                failed_updates.append(exercise_id)
                continue
    
    # Now update existing records
    for record in existing_records:
        exercise_id = record.exercise_id
        update_item = exercise_updates.get(exercise_id)
        
        if not update_item:
            continue
            
        try:
            update_made = False
            # Update fields if they are provided in the request
            if update_item.current_weight is not None and record.current_weight != update_item.current_weight:
                record.current_weight = update_item.current_weight
                # When setting initial weight, also set next_weight if it's not already set by progression
                if record.next_weight is None:
                     record.next_weight = update_item.current_weight
                update_made = True

            if update_item.current_reps is not None and record.current_reps != update_item.current_reps:
                record.current_reps = update_item.current_reps
                # When setting initial reps, also set next_reps if it's not already set by progression
                if record.next_reps is None:
                     record.next_reps = update_item.current_reps
                update_made = True

            if update_made:
                updated_count += 1
        except Exception as e:
            print(f"Error updating progress record for exercise {exercise_id}: {str(e)}")
            failed_updates.append(exercise_id)
            continue
    
    # Commit all successful changes
    try:
        db.commit()
        print(f"Committed {updated_count} progress updates.")
    except Exception as e:
        db.rollback()
        print(f"Database error during batch update: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=f"Database error during update: {str(e)}")

    # Report on failures if any
    if failed_updates:
        print(f"Failed to update {len(failed_updates)} exercises: {failed_updates}")
        
    return UserProgressBatchUpdateResponse(
        message=f"Successfully updated {updated_count} progress records. Failed: {len(failed_updates)}",
        updated_count=updated_count
    ) 