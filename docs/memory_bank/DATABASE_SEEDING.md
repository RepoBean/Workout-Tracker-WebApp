# Workout Tracker - Database Seeding

This document outlines the database seeding process for the Workout Tracker application.

## Overview

The database seeding process populates the database with:
- A default admin user account
- A comprehensive exercise library with various categories
- Sample workout plans with exercises

## Seed Files Structure

The seed data is organized in the following files:

- `backend/app/seed_data/seed_db.py` - Main script for seeding the database
- `backend/app/seed_data/exercise_library.py` - Contains exercise definitions organized by muscle groups
- `backend/app/seed_data/workout_plans.py` - Contains sample workout plan definitions

## Exercise Library

The exercise library contains exercises organized by muscle groups:
- Chest exercises (bench press, push-ups, etc.)
- Back exercises (pull-ups, rows, etc.)
- Leg exercises (squats, deadlifts, etc.)
- Shoulder exercises
- Arm exercises
- Core exercises

Each exercise includes:
- Name and description
- Category (compound, isolation, etc.)
- Equipment required
- Primary and secondary muscle groups
- Instructions for proper form
- Weight recommendations for different experience levels
- Progression scheme

## Sample Workout Plans

The seed data includes sample workout plans:
1. **Beginner Full Body Program** - A 3-day full body program for beginners
2. **Push Pull Legs Split** - A 6-day program split for intermediate lifters

Each plan includes:
- Name and description
- Public/private status
- Recommended days per week and duration
- Exercises with sets, reps, rest periods, and progression schemes

## Running the Seed Script

To run the database seeding script, use Docker Compose to execute the command within the backend container:

```bash
docker compose exec backend python -m app.seed_data.seed_db
```

### Options

- To preserve existing data and only add missing entries:
  ```bash
  docker compose exec backend python -m app.seed_data.seed_db --keep-existing
  ```

## Important Notes

1. **Docker Compose Syntax**: Use `docker compose` (without hyphen) for Docker Compose V2. The older `docker-compose` syntax is deprecated.

2. **Database Reset**: By default, the seed script clears all existing data before seeding. Use the `--keep-existing` flag to preserve existing data.

3. **Default Admin Account**: The seed script creates a default admin user with:
   - Username: `admin`
   - Email: `admin@example.com`
   - Password: `adminpassword`

4. **Weight Conversion**: The script automatically converts weight recommendations between kg and lb units.

5. **Dependencies**: The script requires `bcrypt` for password hashing, which should be included in the Docker container.

## Extending the Seed Data

### Adding New Exercises

To add new exercises, update the `exercise_library.py` file with additional exercise definitions following the existing pattern:

```python
create_exercise(
    "Exercise Name",
    "Description",
    CATEGORIES["category_type"],
    EQUIPMENT["equipment_type"],
    MUSCLE_GROUPS["primary_muscle"],
    [SECONDARY_MUSCLE_GROUPS["secondary_muscle1"], SECONDARY_MUSCLE_GROUPS["secondary_muscle2"]],
    "Detailed instructions",
    "Difficulty level",
    weight_recommendation_dict,
    PROGRESSION_TYPES["progression_type"]
)
```

### Adding New Workout Plans

To add new workout plans, update the `workout_plans.py` file with additional plan definitions following the existing pattern:

```python
{
    "name": "Plan Name",
    "description": "Plan description",
    "is_public": True,
    "days_per_week": 3,
    "duration_weeks": 8,
    "exercises": [
        {
            "name": "Exercise Name",
            "sets": 3,
            "reps": 8,
            "rest_seconds": 90,
            "order": 1,
            "day_of_week": 1,
            "progression_type": "weight",
            "progression_value": 2.5,
            "progression_threshold": 2
        },
        # Additional exercises...
    ]
}
```

## Troubleshooting

If you encounter issues with the seeding process:

1. **Database Connection**: Ensure the database container is running and the `DATABASE_URL` environment variable is correctly set.

2. **Missing Exercises**: If workout plans reference exercises that don't exist in the library, warnings will be displayed during seeding.

3. **Duplicate Data**: If you run the seed script multiple times without the `--keep-existing` flag, it will clear and recreate all data. 