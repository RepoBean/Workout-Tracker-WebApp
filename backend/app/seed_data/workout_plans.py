"""
Sample Workout Plans for Workout Tracker Application.
This module contains seed data for predefined workout plans.
"""

# Dictionary of sample workout plans
WORKOUT_PLANS = [
    {
        "name": "Beginner Full Body Program",
        "description": "A 3-day full body program designed for beginners to build foundational strength and learn proper form.",
        "is_public": True,
        "days_per_week": 3,
        "duration_weeks": 8,
        "exercises": [
            # Day 1 - Full Body
            {
                "name": "Bench Press",
                "sets": 3,
                "reps": 8,
                "rest_seconds": 90,
                "order": 1,
                "day_of_week": 1,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Bent Over Row",
                "sets": 3,
                "reps": 8,
                "rest_seconds": 90,
                "order": 2,
                "day_of_week": 1,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Squat",
                "sets": 3,
                "reps": 8,
                "rest_seconds": 120,
                "order": 3,
                "day_of_week": 1,
                "progression_type": "weight",
                "progression_value": 5.0,
                "progression_threshold": 2
            },
            {
                "name": "Push-up",
                "sets": 3,
                "reps": 10,
                "rest_seconds": 60,
                "order": 4,
                "day_of_week": 1,
                "progression_type": "reps",
                "progression_value": 2,
                "progression_threshold": 2
            },
            
            # Day 2 - Full Body
            {
                "name": "Deadlift",
                "sets": 3,
                "reps": 6,
                "rest_seconds": 120,
                "order": 1,
                "day_of_week": 3,
                "progression_type": "weight",
                "progression_value": 5.0,
                "progression_threshold": 2
            },
            {
                "name": "Dumbbell Bench Press",
                "sets": 3,
                "reps": 10,
                "rest_seconds": 90,
                "order": 2,
                "day_of_week": 3,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Pull-up",
                "sets": 3,
                "reps": 5,
                "rest_seconds": 90,
                "order": 3,
                "day_of_week": 3,
                "progression_type": "reps",
                "progression_value": 1,
                "progression_threshold": 2
            },
            
            # Day 3 - Full Body
            {
                "name": "Squat",
                "sets": 3,
                "reps": 10,
                "rest_seconds": 120,
                "order": 1,
                "day_of_week": 5,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Bench Press",
                "sets": 3,
                "reps": 10,
                "rest_seconds": 90,
                "order": 2,
                "day_of_week": 5,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Lat Pulldown",
                "sets": 3,
                "reps": 10,
                "rest_seconds": 90,
                "order": 3,
                "day_of_week": 5,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            }
        ]
    },
    {
        "name": "Push Pull Legs Split",
        "description": "A 6-day program split into push, pull, and leg days for intermediate lifters looking to build muscle and strength.",
        "is_public": True,
        "days_per_week": 6,
        "duration_weeks": 12,
        "exercises": [
            # Day 1 - Push
            {
                "name": "Bench Press",
                "sets": 4,
                "reps": 8,
                "rest_seconds": 120,
                "order": 1,
                "day_of_week": 1,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Incline Bench Press",
                "sets": 3,
                "reps": 10,
                "rest_seconds": 90,
                "order": 2,
                "day_of_week": 1,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Cable Crossover",
                "sets": 3,
                "reps": 12,
                "rest_seconds": 60,
                "order": 3,
                "day_of_week": 1,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            
            # Day 2 - Pull
            {
                "name": "Deadlift",
                "sets": 3,
                "reps": 6,
                "rest_seconds": 180,
                "order": 1,
                "day_of_week": 2,
                "progression_type": "weight",
                "progression_value": 5.0,
                "progression_threshold": 2
            },
            {
                "name": "Pull-up",
                "sets": 4,
                "reps": 8,
                "rest_seconds": 90,
                "order": 2,
                "day_of_week": 2,
                "progression_type": "reps",
                "progression_value": 1,
                "progression_threshold": 2
            },
            {
                "name": "Bent Over Row",
                "sets": 3,
                "reps": 10,
                "rest_seconds": 90,
                "order": 3,
                "day_of_week": 2,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            
            # Day 3 - Legs
            {
                "name": "Squat",
                "sets": 4,
                "reps": 8,
                "rest_seconds": 180,
                "order": 1,
                "day_of_week": 3,
                "progression_type": "weight",
                "progression_value": 5.0,
                "progression_threshold": 2
            },
            {
                "name": "Deadlift",
                "sets": 3,
                "reps": 8,
                "rest_seconds": 180,
                "order": 2,
                "day_of_week": 3,
                "progression_type": "weight",
                "progression_value": 5.0,
                "progression_threshold": 2
            },
            
            # Day 4 - Push
            {
                "name": "Dumbbell Bench Press",
                "sets": 4,
                "reps": 10,
                "rest_seconds": 90,
                "order": 1,
                "day_of_week": 4,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Push-up",
                "sets": 3,
                "reps": 15,
                "rest_seconds": 60,
                "order": 2,
                "day_of_week": 4,
                "progression_type": "reps",
                "progression_value": 2,
                "progression_threshold": 2
            },
            
            # Day 5 - Pull
            {
                "name": "Lat Pulldown",
                "sets": 4,
                "reps": 10,
                "rest_seconds": 90,
                "order": 1,
                "day_of_week": 5,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            {
                "name": "Seated Cable Row",
                "sets": 3,
                "reps": 12,
                "rest_seconds": 90,
                "order": 2,
                "day_of_week": 5,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            },
            
            # Day 6 - Legs
            {
                "name": "Squat",
                "sets": 4,
                "reps": 10,
                "rest_seconds": 120,
                "order": 1,
                "day_of_week": 6,
                "progression_type": "weight",
                "progression_value": 2.5,
                "progression_threshold": 2
            }
        ]
    }
]
