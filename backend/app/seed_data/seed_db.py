"""
Database Seeding Script for Workout Tracker Application.

This script seeds the database with:
- Default user account
- Exercise library
- Sample workout plans

Usage:
    python -m app.seed_data.seed_db [--keep-existing]

Options:
    --keep-existing    Don't clear existing data before seeding
"""

import sys
import argparse
from typing import List, Dict, Any, Optional
import bcrypt
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.models import User, Exercise, WorkoutPlan, PlanExercise
from app.seed_data.exercise_library import (
    CHEST_EXERCISES, BACK_EXERCISES, LEGS_EXERCISES, 
    SHOULDERS_EXERCISES, ARMS_EXERCISES, CORE_EXERCISES
)
# Import workout plans
from app.seed_data.workout_plans import WORKOUT_PLANS

# Default admin user
DEFAULT_ADMIN = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "adminpassword",  # This will be hashed before storage
    "is_admin": True
}

def create_tables():
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)

def clear_tables(db: Session):
    """Clear all data from the tables."""
    # Delete in order to respect foreign key constraints
    db.query(PlanExercise).delete()
    db.query(WorkoutPlan).delete()
    db.query(Exercise).delete()
    db.query(User).delete()
    db.commit()

def hash_password(password: str) -> str:
    """Hash a password for storage."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def seed_users(db: Session):
    """Seed the database with default users."""
    # Create admin user
    admin_user = User(
        username=DEFAULT_ADMIN["username"],
        email=DEFAULT_ADMIN["email"],
        hashed_password=hash_password(DEFAULT_ADMIN["password"]),
        is_admin=DEFAULT_ADMIN["is_admin"]
    )
    db.add(admin_user)
    db.commit()
    print(f"Created admin user: {admin_user.username}")
    return admin_user

def parse_weight_recommendation(weight_rec: Any) -> tuple:
    """
    Parse weight recommendation from string or dictionary to kg/lb values.
    Returns a tuple of (kg_value, lb_value)
    """
    # Default values
    kg_value = None
    lb_value = None
    
    if isinstance(weight_rec, dict):
        # For structured recommendations like {'beginner': {'male': '45-95 lbs'}}
        # We'll take the intermediate male value as default
        if 'intermediate' in weight_rec and 'male' in weight_rec['intermediate']:
            weight_str = weight_rec['intermediate']['male']
        else:
            # Use the first available value
            for level in weight_rec:
                if isinstance(weight_rec[level], dict) and 'male' in weight_rec[level]:
                    weight_str = weight_rec[level]['male']
                    break
            else:
                # If no structured data found
                return None, None
    else:
        # For simple string recommendations
        weight_str = str(weight_rec)
    
    # Parse the weight string
    if 'lbs' in weight_str or 'lb' in weight_str:
        # Extract numeric part
        try:
            # Handle ranges like "45-95 lbs" by taking the average
            if '-' in weight_str:
                parts = weight_str.split('-')
                first_num = float(''.join(c for c in parts[0] if c.isdigit() or c == '.'))
                second_part = parts[1].split(' ')[0].strip()
                second_num = float(''.join(c for c in second_part if c.isdigit() or c == '.'))
                lb_value = (first_num + second_num) / 2
            else:
                lb_value = float(''.join(c for c in weight_str if c.isdigit() or c == '.'))
            # Convert to kg
            kg_value = lb_value * 0.453592
        except (ValueError, IndexError):
            # If parsing fails, leave as None
            pass
    
    elif 'kg' in weight_str:
        # Extract numeric part for kg
        try:
            if '-' in weight_str:
                parts = weight_str.split('-')
                first_num = float(''.join(c for c in parts[0] if c.isdigit() or c == '.'))
                second_part = parts[1].split(' ')[0].strip()
                second_num = float(''.join(c for c in second_part if c.isdigit() or c == '.'))
                kg_value = (first_num + second_num) / 2
            else:
                kg_value = float(''.join(c for c in weight_str if c.isdigit() or c == '.'))
            # Convert to lb
            lb_value = kg_value * 2.20462
        except (ValueError, IndexError):
            # If parsing fails, leave as None
            pass
    
    return kg_value, lb_value

def seed_exercises(db: Session, admin_user: User):
    """Seed the database with exercises from the exercise library."""
    # Combine all exercise lists
    all_exercises = []
    all_exercises.extend(CHEST_EXERCISES)
    all_exercises.extend(BACK_EXERCISES)
    
    # Add other exercise categories if they exist
    if 'LEGS_EXERCISES' in globals():
        all_exercises.extend(LEGS_EXERCISES)
    if 'SHOULDERS_EXERCISES' in globals():
        all_exercises.extend(SHOULDERS_EXERCISES)
    if 'ARMS_EXERCISES' in globals():
        all_exercises.extend(ARMS_EXERCISES)
    if 'CORE_EXERCISES' in globals():
        all_exercises.extend(CORE_EXERCISES)
    
    exercise_count = 0
    exercise_dict = {}  # Store exercises by name for later reference
    
    for exercise_data in all_exercises:
        # Parse weight recommendations
        kg_weight, lb_weight = parse_weight_recommendation(exercise_data.get("weight_recommendation"))
        
        # Convert secondary muscles from list to comma-separated string
        secondary_muscles = None
        if "secondary_muscle_groups" in exercise_data and exercise_data["secondary_muscle_groups"]:
            secondary_muscles = ",".join(exercise_data["secondary_muscle_groups"])
        
        # Create exercise object
        exercise = Exercise(
            name=exercise_data["name"],
            description=exercise_data["description"],
            category=exercise_data["category"],
            equipment=exercise_data["equipment"],
            is_system=True,  # Mark as system exercise
            created_by=admin_user.id,
            muscle_group=exercise_data["primary_muscle_group"],
            secondary_muscle_groups=secondary_muscles,
            instructions=exercise_data["instructions"],
            starting_weight_kg=kg_weight,
            starting_weight_lb=lb_weight,
            progression_type=exercise_data.get("progression_scheme"),
            difficulty_level=exercise_data.get("difficulty"),
        )
        
        db.add(exercise)
        exercise_count += 1
        
        # Store the exercise object by name for later reference
        exercise_dict[exercise_data["name"]] = exercise
    
    db.commit()
    print(f"Seeded {exercise_count} exercises")
    
    return exercise_dict

def seed_workout_plans(db: Session, admin_user: User, exercise_dict: Dict[str, Exercise]):
    """
    Seed the database with sample workout plans.
    """
    plan_count = 0
    exercise_count = 0
    
    for plan_data in WORKOUT_PLANS:
        # Create workout plan
        workout_plan = WorkoutPlan(
            name=plan_data["name"],
            description=plan_data["description"],
            owner_id=admin_user.id,
            is_public=plan_data["is_public"],
            days_per_week=plan_data["days_per_week"],
            duration_weeks=plan_data["duration_weeks"]
        )
        
        db.add(workout_plan)
        db.flush()  # Get the workout_plan.id
        
        # Add exercises to the plan
        for ex_data in plan_data["exercises"]:
            # Find the exercise by name
            exercise_name = ex_data["name"]
            if exercise_name not in exercise_dict:
                print(f"Warning: Exercise '{exercise_name}' not found in exercise library. Skipping.")
                continue
            
            exercise = exercise_dict[exercise_name]
            
            # Create plan_exercise
            plan_exercise = PlanExercise(
                workout_plan_id=workout_plan.id,
                exercise_id=exercise.id,
                sets=ex_data["sets"],
                reps=ex_data["reps"],
                rest_seconds=ex_data.get("rest_seconds"),
                order=ex_data["order"],
                day_of_week=ex_data.get("day_of_week"),
                progression_type=ex_data.get("progression_type"),
                progression_value=ex_data.get("progression_value"),
                progression_threshold=ex_data.get("progression_threshold")
            )
            
            db.add(plan_exercise)
            exercise_count += 1
        
        plan_count += 1
    
    db.commit()
    print(f"Seeded {plan_count} workout plans with {exercise_count} exercises")

def main():
    """Main function to seed the database."""
    parser = argparse.ArgumentParser(description="Seed the workout tracker database")
    parser.add_argument('--keep-existing', action='store_true', 
                        help="Don't clear existing data before seeding")
    
    args = parser.parse_args()
    
    # Create tables if they don't exist
    create_tables()
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Clear tables if not keeping existing data
        if not args.keep_existing:
            print("Clearing existing data...")
            clear_tables(db)
        
        # Seed users
        admin_user = seed_users(db)
        
        # Seed exercises
        exercise_dict = seed_exercises(db, admin_user)
        
        # Seed workout plans
        seed_workout_plans(db, admin_user, exercise_dict)
        
        print("Database seeding completed successfully!")
    
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    
    finally:
        db.close()

if __name__ == "__main__":
    main()
