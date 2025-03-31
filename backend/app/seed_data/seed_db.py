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
import json
import os

from app.database import SessionLocal, engine, Base
from app.models.models import User, Exercise, WorkoutPlan, PlanExercise, ExerciseSet, SessionExercise, WorkoutSession, SharedPlan

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
    db.query(ExerciseSet).delete()
    db.query(SessionExercise).delete()
    db.query(WorkoutSession).delete()
    db.query(SharedPlan).delete()
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
    """Finds the first created user to associate seed data with."""
    # Query for the first user based on ID
    print("Checking for the first registered user...")
    first_user = None
    try:
        # Order by ID ascending and take the first one
        first_user = db.query(User).order_by(User.id.asc()).first()
    except Exception as e:
        print("\n!!! Database Error Encountered !!!")
        print("This likely means your User model definition in models.py does not match")
        print("the actual 'users' table schema in your database.")
        print(f"Specific Error: {e}")
        print("Please run database migrations (e.g., using Alembic) to align them.")
        print("Aborting seed process.")
        return None # Return None to signal main function to stop

    if first_user:
        print(f"Found first user '{first_user.username}' (ID: {first_user.id}). Seed data will be associated with this user.")
        return first_user
    else:
        # If no users exist, print error and return None.
        print(f"Error: No users found in the database.")
        print("Please create the first user account through the application's normal signup process first.")
        print("Aborting seed process.")
        return None

def seed_exercises(db: Session, admin_user: User):
    """Seed the database with exercises from exercise_library_list.json."""
    exercise_count = 0
    exercise_dict = {}  # Store exercises by name for later reference

    # Construct the path to the JSON file relative to this script's location
    script_dir = os.path.dirname(__file__)
    json_path = os.path.join(script_dir, 'exercise_library_list.json')

    try:
        with open(json_path, 'r') as f:
            all_exercises_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Cannot find {json_path}. Make sure it's in the seed_data directory.")
        return {}
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {json_path}.")
        return {}

    print(f"Loading exercises from {json_path}...")

    for exercise_data in all_exercises_data:
        # Check if exercise already exists by name (important if --keep-existing is used)
        exercise_name = exercise_data.get("name")
        if not exercise_name:
             print(f"Warning: Skipping exercise due to missing name: {exercise_data}")
             continue

        existing_exercise = db.query(Exercise).filter(Exercise.name == exercise_name).first()
        if existing_exercise:
            # print(f"Exercise '{exercise_name}' already exists, skipping creation.")
            exercise_dict[exercise_name] = existing_exercise # Ensure it's in the dict for plan seeding
            continue

        # Create exercise object from JSON data
        # Map JSON fields to Exercise model fields
        exercise = Exercise(
            name=exercise_name,
            description=exercise_data.get("description"),
            category=exercise_data.get("category"),
            equipment=exercise_data.get("equipment"),
            muscle_group=exercise_data.get("muscle_group"),
            # Fields not in this specific JSON will be default/None
            # secondary_muscle_groups=None,
            # instructions=None,
            # starting_weight_kg=None,
            # starting_weight_lb=None,
            # progression_type=None,
            # difficulty_level=None,
            is_system=True,  # Mark as system exercise
            created_by=admin_user.id,
        )

        db.add(exercise)
        exercise_count += 1

        # Important: Need to flush to get the object in the session
        # so it can be added to the dictionary before commit
        db.flush()
        exercise_dict[exercise.name] = exercise # Use the actual ORM object

    # Commit is handled after seeding plans now
    print(f"Prepared {exercise_count} new exercises for seeding.")

    return exercise_dict

def seed_workout_plans(db: Session, admin_user: User, exercise_dict: Dict[str, Exercise]):
    """
    Seed the database with sample workout plans from JSON files.
    Currently loads 'test workout.json'.
    """
    plan_count = 0
    exercise_count = 0

    # List of JSON plan files to load
    plan_files = ['test workout.json'] # Add more filenames here if needed
    script_dir = os.path.dirname(__file__)

    for plan_filename in plan_files:
        json_path = os.path.join(script_dir, plan_filename)
        print(f"Loading workout plan from {json_path}...")

        try:
            with open(json_path, 'r') as f:
                plan_data = json.load(f)
        except FileNotFoundError:
            print(f"Error: Cannot find {json_path}. Skipping this plan.")
            continue
        except json.JSONDecodeError:
            print(f"Error: Could not decode JSON from {json_path}. Skipping this plan.")
            continue

        # Check if plan already exists by name (important if --keep-existing is used)
        plan_name = plan_data.get("name")
        if not plan_name:
            print(f"Warning: Skipping workout plan due to missing name in {plan_filename}")
            continue

        existing_plan = db.query(WorkoutPlan).filter(WorkoutPlan.name == plan_name).first()
        if existing_plan:
            # print(f"Workout plan '{plan_name}' already exists, skipping.")
            continue

        # Create workout plan
        workout_plan = WorkoutPlan(
            name=plan_name,
            description=plan_data.get("description"),
            owner_id=admin_user.id,
            is_public=plan_data.get("is_public", False), # Default to False if missing
            days_per_week=plan_data.get("days_per_week"),
            duration_weeks=plan_data.get("duration_weeks")
        )

        db.add(workout_plan)
        db.flush()  # Get the workout_plan.id before adding exercises

        # Add exercises to the plan
        if "exercises" in plan_data:
            for ex_data in plan_data["exercises"]:
                # Find the exercise by name (using the dictionary built earlier)
                # Use 'exercise_name' from the JSON workout plan structure
                exercise_name = ex_data.get("exercise_name")
                if not exercise_name:
                    print(f"Warning: Skipping exercise in plan '{workout_plan.name}' due to missing 'exercise_name'.")
                    continue

                if exercise_name not in exercise_dict:
                    print(f"Warning: Exercise '{exercise_name}' for plan '{workout_plan.name}' not found in seeded exercises. Skipping.")
                    continue

                exercise = exercise_dict[exercise_name] # Get the Exercise object

                # Create plan_exercise using data from the JSON workout plan
                plan_exercise = PlanExercise(
                    workout_plan_id=workout_plan.id,
                    exercise_id=exercise.id, # Use the ID from the looked-up Exercise object
                    sets=ex_data.get("sets"),
                    reps=ex_data.get("reps"),
                    target_weight=ex_data.get("target_weight"), # Add target_weight if present
                    rest_seconds=ex_data.get("rest_seconds"),
                    order=ex_data.get("order"),
                    day_of_week=ex_data.get("day_of_week"),
                    progression_type=ex_data.get("progression_type"),
                    progression_value=ex_data.get("progression_value"),
                    progression_threshold=ex_data.get("progression_threshold")
                )

                # Validate before adding
                if plan_exercise.sets is None or plan_exercise.reps is None:
                     print(f"Warning: Skipping exercise '{exercise_name}' in plan '{workout_plan.name}' due to missing sets/reps.")
                     continue

                db.add(plan_exercise)
                exercise_count += 1

        plan_count += 1

    # Commit is handled in main() now
    print(f"Prepared {plan_count} new workout plans with {exercise_count} exercises for seeding.")

def main():
    """Main function to seed the database."""
    parser = argparse.ArgumentParser(description="Seed the workout tracker database")
    parser.add_argument('--keep-existing', action='store_true',
                        help="Don't clear existing data before seeding")

    args = parser.parse_args()

    # Create tables if they don't exist
    print("Ensuring database tables exist...")
    create_tables()

    # Get database session
    db = SessionLocal()

    try:
        # Clear tables if not keeping existing data
        if not args.keep_existing:
            print("Clearing existing data...")
            clear_tables(db) # This function already commits the deletes

        # --- Find the First User ---
        print("Looking for the first registered user...")
        owner_user = seed_users(db) # Renamed variable for clarity

        # --- Stop if No User Found ---
        if owner_user is None:
            # Error message is printed within seed_users
            sys.exit(1) # Exit script

        # --- Proceed with Seeding Exercises and Plans using the found user's ID ---
        print("Seeding exercises...")
        exercise_dict = seed_exercises(db, owner_user)

        print("Seeding workout plans...")
        seed_workout_plans(db, owner_user, exercise_dict)

        # Commit all changes
        print("Committing changes to database...")
        db.commit()

        print("Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"An unexpected error occurred during seeding: {e}")
        # Consider more detailed error logging or re-raising depending on context
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        db.close()

if __name__ == "__main__":
    main()
