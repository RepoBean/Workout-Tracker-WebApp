from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    profile_picture = Column(String, nullable=True)
    settings = Column(Text, nullable=True)  # JSON string for user settings
    active_plan_id = Column(Integer, ForeignKey("workout_plans.id"), nullable=True)
    
    # Relationships
    workout_plans = relationship("WorkoutPlan", back_populates="owner", foreign_keys="WorkoutPlan.owner_id")
    active_plan = relationship("WorkoutPlan", foreign_keys=[active_plan_id])
    workout_sessions = relationship("WorkoutSession", back_populates="user")
    created_exercises = relationship("Exercise", back_populates="created_by_user")
    shared_plans_owned = relationship("SharedPlan", foreign_keys="SharedPlan.owner_id", back_populates="owner")
    shared_plans_received = relationship("SharedPlan", foreign_keys="SharedPlan.shared_with_id", back_populates="shared_with")

class Exercise(Base):
    __tablename__ = "exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, index=True, nullable=True)
    equipment = Column(String, nullable=True)
    is_system = Column(Boolean, default=False, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    muscle_group = Column(String, nullable=True)  # Primary muscle group
    secondary_muscle_groups = Column(String, nullable=True)  # Comma-separated secondary muscle groups
    instructions = Column(Text, nullable=True)
    starting_weight_kg = Column(Float, nullable=True)  # Starting weight recommendation in kg
    starting_weight_lb = Column(Float, nullable=True)  # Starting weight recommendation in lb
    progression_type = Column(String, nullable=True)  # 'weight' or 'reps'
    progression_value = Column(Float, nullable=True)  # Amount to increase (kg/lb or reps)
    difficulty_level = Column(String, nullable=True)  # 'beginner', 'intermediate', 'advanced'
    
    # Relationships
    created_by_user = relationship("User", back_populates="created_exercises")
    plan_exercises = relationship("PlanExercise", back_populates="exercise")
    session_exercises = relationship("SessionExercise", back_populates="exercise")

class WorkoutPlan(Base):
    __tablename__ = "workout_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    days_per_week = Column(Integer, nullable=True)
    duration_weeks = Column(Integer, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="workout_plans", foreign_keys=[owner_id])
    exercises = relationship("PlanExercise", back_populates="workout_plan", cascade="all, delete-orphan")
    workout_sessions = relationship("WorkoutSession", back_populates="workout_plan")
    shared_plans = relationship("SharedPlan", back_populates="plan", cascade="all, delete-orphan")

class PlanExercise(Base):
    __tablename__ = "plan_exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    workout_plan_id = Column(Integer, ForeignKey("workout_plans.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    sets = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=False)
    rest_seconds = Column(Integer, nullable=True)
    target_weight = Column(Float, nullable=True)
    order = Column(Integer, nullable=False)
    day_of_week = Column(Integer, nullable=True)
    progression_type = Column(String, nullable=True)
    progression_value = Column(Float, nullable=True)
    progression_threshold = Column(Integer, nullable=True)
    
    # Relationships
    workout_plan = relationship("WorkoutPlan", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="plan_exercises")

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    workout_plan_id = Column(Integer, ForeignKey("workout_plans.id"), nullable=True)
    start_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    day_of_week = Column(Integer, nullable=True)
    status = Column(String, default="in_progress", nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="workout_sessions")
    workout_plan = relationship("WorkoutPlan", back_populates="workout_sessions")
    exercises = relationship("SessionExercise", back_populates="session", cascade="all, delete-orphan")

class SessionExercise(Base):
    __tablename__ = "session_exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id", ondelete="CASCADE"))
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    sets_completed = Column(Integer, default=0)
    order = Column(Integer)
    notes = Column(Text, nullable=True)
    # Add columns for plan-specific exercise details
    target_weight = Column(Float, nullable=True)
    target_reps = Column(Integer, nullable=True)
    rest_seconds = Column(Integer, nullable=True)
    sets_count = Column(Integer, nullable=True)
    
    # Relationships
    session = relationship("WorkoutSession", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="session_exercises")
    sets = relationship("ExerciseSet", back_populates="session_exercise", cascade="all, delete-orphan", lazy="joined")

class ExerciseSet(Base):
    __tablename__ = "exercise_sets"
    
    id = Column(Integer, primary_key=True, index=True)
    session_exercise_id = Column(Integer, ForeignKey("session_exercises.id", ondelete="CASCADE"), nullable=False)
    reps = Column(Integer, nullable=False)
    weight = Column(Float, nullable=True)
    set_number = Column(Integer, nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_warmup = Column(Boolean, default=False, nullable=False)
    perceived_effort = Column(Integer, nullable=True)
    
    # Relationships
    session_exercise = relationship("SessionExercise", back_populates="sets")

class SharedPlan(Base):
    __tablename__ = "shared_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("workout_plans.id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_with_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    can_edit = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    plan = relationship("WorkoutPlan", back_populates="shared_plans")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="shared_plans_owned")
    shared_with = relationship("User", foreign_keys=[shared_with_id], back_populates="shared_plans_received") 