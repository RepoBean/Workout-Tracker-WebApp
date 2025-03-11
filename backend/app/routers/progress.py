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
    ExerciseSet
)
from app.services.auth import get_current_active_user

router = APIRouter()

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

@router.get("/personal-records")
async def get_personal_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get personal records for all exercises.
    """
    # Get all exercises the user has performed
    exercises_query = (
        db.query(Exercise)
        .join(SessionExercise, Exercise.id == SessionExercise.exercise_id)
        .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
        .filter(WorkoutSession.user_id == current_user.id)
        .distinct()
    )
    
    exercises = exercises_query.all()
    
    records = []
    for exercise in exercises:
        # Get max weight for this exercise
        max_weight_query = (
            db.query(func.max(ExerciseSet.weight).label("max_weight"))
            .join(SessionExercise, ExerciseSet.session_exercise_id == SessionExercise.id)
            .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
            .filter(
                WorkoutSession.user_id == current_user.id,
                SessionExercise.exercise_id == exercise.id,
                ExerciseSet.is_warmup == False
            )
        )
        max_weight_result = max_weight_query.first()
        max_weight = max_weight_result.max_weight if max_weight_result.max_weight else 0
        
        # Get max reps for this exercise
        max_reps_query = (
            db.query(func.max(ExerciseSet.reps).label("max_reps"))
            .join(SessionExercise, ExerciseSet.session_exercise_id == SessionExercise.id)
            .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
            .filter(
                WorkoutSession.user_id == current_user.id,
                SessionExercise.exercise_id == exercise.id,
                ExerciseSet.is_warmup == False
            )
        )
        max_reps_result = max_reps_query.first()
        max_reps = max_reps_result.max_reps if max_reps_result.max_reps else 0
        
        # Get max volume (weight * reps) for this exercise in a single set
        max_volume_query = (
            db.query(func.max(ExerciseSet.weight * ExerciseSet.reps).label("max_volume"))
            .join(SessionExercise, ExerciseSet.session_exercise_id == SessionExercise.id)
            .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
            .filter(
                WorkoutSession.user_id == current_user.id,
                SessionExercise.exercise_id == exercise.id,
                ExerciseSet.is_warmup == False
            )
        )
        max_volume_result = max_volume_query.first()
        max_volume = max_volume_result.max_volume if max_volume_result.max_volume else 0
        
        records.append({
            "exercise": {
                "id": exercise.id,
                "name": exercise.name,
                "category": exercise.category
            },
            "max_weight": max_weight,
            "max_reps": max_reps,
            "max_volume": max_volume
        })
    
    # Sort by category then name
    records.sort(key=lambda x: (x["exercise"]["category"] or "", x["exercise"]["name"]))
    
    return {
        "personal_records": records
    }

@router.get("/summary")
async def get_workout_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a summary of workout statistics.
    """
    # Total workouts
    total_workouts_query = (
        db.query(func.count(WorkoutSession.id))
        .filter(WorkoutSession.user_id == current_user.id)
    )
    total_workouts = total_workouts_query.scalar() or 0
    
    # Total volume lifted
    total_volume_query = (
        db.query(func.sum(ExerciseSet.weight * ExerciseSet.reps))
        .join(SessionExercise, ExerciseSet.session_exercise_id == SessionExercise.id)
        .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
        .filter(
            WorkoutSession.user_id == current_user.id,
            ExerciseSet.is_warmup == False
        )
    )
    total_volume = total_volume_query.scalar() or 0
    
    # Total exercises performed
    total_exercises_query = (
        db.query(func.count(func.distinct(SessionExercise.exercise_id)))
        .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
        .filter(WorkoutSession.user_id == current_user.id)
    )
    total_exercises = total_exercises_query.scalar() or 0
    
    # Total sets performed
    total_sets_query = (
        db.query(func.count(ExerciseSet.id))
        .join(SessionExercise, ExerciseSet.session_exercise_id == SessionExercise.id)
        .join(WorkoutSession, SessionExercise.session_id == WorkoutSession.id)
        .filter(
            WorkoutSession.user_id == current_user.id,
            ExerciseSet.is_warmup == False
        )
    )
    total_sets = total_sets_query.scalar() or 0
    
    # First workout date
    first_workout_query = (
        db.query(func.min(WorkoutSession.start_time))
        .filter(WorkoutSession.user_id == current_user.id)
    )
    first_workout = first_workout_query.scalar()
    
    # Last workout date
    last_workout_query = (
        db.query(func.max(WorkoutSession.start_time))
        .filter(WorkoutSession.user_id == current_user.id)
    )
    last_workout = last_workout_query.scalar()
    
    # Calculate days since first workout
    days_training = 0
    if first_workout and last_workout:
        days_training = (last_workout - first_workout).days + 1
    
    # Calculate average workouts per week
    avg_workouts_per_week = 0
    if days_training > 0:
        avg_workouts_per_week = (total_workouts / days_training) * 7
    
    return {
        "total_workouts": total_workouts,
        "total_volume": float(total_volume) if total_volume else 0,
        "total_exercises": total_exercises,
        "total_sets": total_sets,
        "first_workout": first_workout.isoformat() if first_workout else None,
        "last_workout": last_workout.isoformat() if last_workout else None,
        "days_training": days_training,
        "avg_workouts_per_week": round(avg_workouts_per_week, 2)
    } 