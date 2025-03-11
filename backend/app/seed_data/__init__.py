"""
Seed data package for populating the workout tracker database with initial data.
This includes the exercise library and sample workout plans.
"""

from .exercise_library import EXERCISE_LIBRARY as exercises
from .workout_plans import WORKOUT_PLANS as workout_plans

__all__ = ["exercises", "workout_plans"]
