import pytest
from fastapi import status
from app.models.models import WorkoutPlan, PlanExercise, Exercise

# Test data
test_plan_data = {
    "name": "Test Workout Plan",
    "description": "A plan created in tests",
    "is_public": True,
    "days_per_week": 3,
    "duration_weeks": 4
}

test_exercise_data = {
    "name": "Test Exercise",
    "description": "An exercise for testing",
    "category": "strength",
    "muscle_group": "chest"
}

test_plan_exercise_data = {
    "sets": 3,
    "reps": 10,
    "rest_seconds": 60,
    "target_weight": 50.0,
    "order": 1,
    "day_of_week": 1
}

def create_test_exercise(db, user_id):
    """Helper function to create a test exercise"""
    exercise = Exercise(
        name=test_exercise_data["name"],
        description=test_exercise_data["description"],
        category=test_exercise_data["category"],
        muscle_group=test_exercise_data["muscle_group"],
        created_by=user_id
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise

@pytest.fixture
def test_exercise(db, test_user):
    """Fixture to create a test exercise in the database"""
    return create_test_exercise(db, test_user["id"])

# Plan creation tests
def test_create_workout_plan(client, user_headers):
    """Test creating a new workout plan"""
    response = client.post(
        "/api/plans",
        json=test_plan_data,
        headers=user_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["name"] == test_plan_data["name"]
    assert data["description"] == test_plan_data["description"]
    assert data["is_public"] == test_plan_data["is_public"]
    assert data["days_per_week"] == test_plan_data["days_per_week"]
    assert data["duration_weeks"] == test_plan_data["duration_weeks"]
    assert data["is_active"] == False
    assert "id" in data
    assert "created_at" in data

def test_create_workout_plan_with_exercise(client, user_headers, test_exercise):
    """Test creating a workout plan with an exercise"""
    plan_with_exercise = {
        **test_plan_data,
        "exercises": [
            {
                "exercise_id": test_exercise.id,
                **test_plan_exercise_data
            }
        ]
    }
    
    response = client.post(
        "/api/plans",
        json=plan_with_exercise,
        headers=user_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert len(data["exercises"]) == 1
    exercise = data["exercises"][0]
    assert exercise["exercise_id"] == test_exercise.id
    assert exercise["sets"] == test_plan_exercise_data["sets"]
    assert exercise["reps"] == test_plan_exercise_data["reps"]
    assert exercise["rest_seconds"] == test_plan_exercise_data["rest_seconds"]
    assert exercise["target_weight"] == test_plan_exercise_data["target_weight"]
    assert exercise["day_of_week"] == test_plan_exercise_data["day_of_week"]

def test_get_workout_plans(client, user_headers, db, test_user):
    """Test getting workout plans"""
    # Create a few workout plans
    for i in range(3):
        plan = WorkoutPlan(
            name=f"Test Plan {i}",
            description=f"Description {i}",
            is_public=True,
            owner_id=test_user["id"]
        )
        db.add(plan)
    
    db.commit()
    
    response = client.get("/api/plans", headers=user_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert len(data) == 3
    for plan in data:
        assert plan["name"].startswith("Test Plan")
        assert plan["description"].startswith("Description")
        assert plan["owner_id"] == test_user["id"]

# Active plan tests
def test_activate_workout_plan(client, user_headers, db, test_user):
    """Test activating a workout plan"""
    # Create a workout plan
    plan = WorkoutPlan(
        name="Plan to Activate",
        description="This plan will be activated",
        is_public=True,
        owner_id=test_user["id"],
        is_active=False
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    response = client.post(
        f"/api/plans/{plan.id}/activate",
        headers=user_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["is_active"] == True
    
    # Verify in the database
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan.id).first()
    assert db_plan.is_active == True

def test_only_one_active_plan(client, user_headers, db, test_user):
    """Test that activating a plan deactivates any previously active plans"""
    # Create two workout plans
    plan1 = WorkoutPlan(
        name="Plan 1",
        description="First plan",
        is_public=True,
        owner_id=test_user["id"],
        is_active=True  # This one starts active
    )
    db.add(plan1)
    
    plan2 = WorkoutPlan(
        name="Plan 2",
        description="Second plan",
        is_public=True,
        owner_id=test_user["id"],
        is_active=False
    )
    db.add(plan2)
    
    db.commit()
    db.refresh(plan1)
    db.refresh(plan2)
    
    # Activate the second plan
    response = client.post(
        f"/api/plans/{plan2.id}/activate",
        headers=user_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    
    # Check that the first plan is now inactive
    db_plan1 = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan1.id).first()
    assert db_plan1.is_active == False
    
    # Check that the second plan is now active
    db_plan2 = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan2.id).first()
    assert db_plan2.is_active == True

def test_get_next_workout(client, user_headers, db, test_user):
    """Test getting the next (active) workout"""
    # Create an active workout plan
    active_plan = WorkoutPlan(
        name="Active Plan",
        description="This is the active plan",
        is_public=True,
        owner_id=test_user["id"],
        is_active=True
    )
    db.add(active_plan)
    
    # Create another inactive plan
    inactive_plan = WorkoutPlan(
        name="Inactive Plan",
        description="This is an inactive plan",
        is_public=True,
        owner_id=test_user["id"],
        is_active=False
    )
    db.add(inactive_plan)
    
    db.commit()
    
    response = client.get("/api/plans/next", headers=user_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["name"] == "Active Plan"
    assert data["is_active"] == True

def test_no_active_plan_returns_404(client, user_headers):
    """Test that requesting next workout without an active plan returns 404"""
    response = client.get("/api/plans/next", headers=user_headers)
    
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "No active workout plan found" in response.json()["detail"]

# Plan exercise tests
def test_add_exercise_to_plan(client, user_headers, db, test_user, test_exercise):
    """Test adding an exercise to a workout plan"""
    # Create a workout plan
    plan = WorkoutPlan(
        name="Plan with Exercise",
        description="Plan to add exercises to",
        is_public=True,
        owner_id=test_user["id"]
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    # Add an exercise to the plan
    response = client.post(
        f"/api/plans/{plan.id}/exercises",
        json={
            "exercise_id": test_exercise.id,
            **test_plan_exercise_data
        },
        headers=user_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["exercise_id"] == test_exercise.id
    assert data["sets"] == test_plan_exercise_data["sets"]
    assert data["reps"] == test_plan_exercise_data["reps"]
    assert data["day_of_week"] == test_plan_exercise_data["day_of_week"]
    
    # Verify in the database
    db_plan_exercise = db.query(PlanExercise).filter(
        PlanExercise.workout_plan_id == plan.id,
        PlanExercise.exercise_id == test_exercise.id
    ).first()
    
    assert db_plan_exercise is not None
    assert db_plan_exercise.sets == test_plan_exercise_data["sets"]
    assert db_plan_exercise.reps == test_plan_exercise_data["reps"]

def test_validation_rejects_invalid_exercise_data(client, user_headers, db, test_user, test_exercise):
    """Test that invalid exercise data is rejected"""
    # Create a workout plan
    plan = WorkoutPlan(
        name="Validation Test Plan",
        description="Plan for validation testing",
        is_public=True,
        owner_id=test_user["id"]
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    # Invalid data: negative sets
    invalid_data = {
        "exercise_id": test_exercise.id,
        "sets": -1,
        "reps": 10,
        "rest_seconds": 60,
        "target_weight": 50,
        "order": 1
    }
    
    response = client.post(
        f"/api/plans/{plan.id}/exercises",
        json=invalid_data,
        headers=user_headers
    )
    
    # FastAPI should validate this with a 422 error
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY 

def test_update_exercise_in_plan(client, user_headers, db, test_user, test_exercise):
    """Test updating an exercise in a workout plan"""
    # Create a workout plan
    plan = WorkoutPlan(
        name="Plan for Exercise Update",
        description="Plan to test exercise updates",
        is_public=True,
        owner_id=test_user["id"]
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    # Add an exercise to the plan
    plan_exercise = PlanExercise(
        workout_plan_id=plan.id,
        exercise_id=test_exercise.id,
        sets=3,
        reps=10,
        rest_seconds=60,
        target_weight=50.0,
        order=1
    )
    db.add(plan_exercise)
    db.commit()
    
    # Update the exercise configuration
    update_data = {
        "sets": 4,
        "reps": 12,
        "rest_seconds": 90,
        "target_weight": 60.0
    }
    
    response = client.put(
        f"/api/plans/{plan.id}/exercises/{test_exercise.id}",
        json=update_data,
        headers=user_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Verify updated values
    assert data["sets"] == update_data["sets"]
    assert data["reps"] == update_data["reps"]
    assert data["rest_seconds"] == update_data["rest_seconds"]
    assert data["target_weight"] == update_data["target_weight"]
    
    # Verify in database
    db_plan_exercise = db.query(PlanExercise).filter(
        PlanExercise.workout_plan_id == plan.id,
        PlanExercise.exercise_id == test_exercise.id
    ).first()
    
    assert db_plan_exercise.sets == update_data["sets"]
    assert db_plan_exercise.reps == update_data["reps"]
    assert db_plan_exercise.rest_seconds == update_data["rest_seconds"]
    assert db_plan_exercise.target_weight == update_data["target_weight"]

def test_remove_exercise_from_plan(client, user_headers, db, test_user, test_exercise):
    """Test removing an exercise from a workout plan"""
    # Create a workout plan
    plan = WorkoutPlan(
        name="Plan for Exercise Removal",
        description="Plan to test exercise removal",
        is_public=True,
        owner_id=test_user["id"]
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    # Add an exercise to the plan
    plan_exercise = PlanExercise(
        workout_plan_id=plan.id,
        exercise_id=test_exercise.id,
        sets=3,
        reps=10,
        rest_seconds=60,
        target_weight=50.0,
        order=1
    )
    db.add(plan_exercise)
    db.commit()
    
    # Remove the exercise
    response = client.delete(
        f"/api/plans/{plan.id}/exercises/{test_exercise.id}",
        headers=user_headers
    )
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify exercise was removed from database
    db_plan_exercise = db.query(PlanExercise).filter(
        PlanExercise.workout_plan_id == plan.id,
        PlanExercise.exercise_id == test_exercise.id
    ).first()
    
    assert db_plan_exercise is None
    
    # Verify plan still exists
    db_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan.id).first()
    assert db_plan is not None

def test_reorder_exercises_in_plan(client, user_headers, db, test_user):
    """Test reordering exercises in a workout plan"""
    # Create a workout plan
    plan = WorkoutPlan(
        name="Plan for Exercise Reordering",
        description="Plan to test exercise reordering",
        is_public=True,
        owner_id=test_user["id"]
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    # Create two exercises
    exercise1 = Exercise(
        name="First Exercise",
        description="Exercise to test reordering (1)",
        category="strength",
        muscle_group="chest",
        created_by=test_user["id"]
    )
    db.add(exercise1)
    
    exercise2 = Exercise(
        name="Second Exercise",
        description="Exercise to test reordering (2)",
        category="strength",
        muscle_group="back",
        created_by=test_user["id"]
    )
    db.add(exercise2)
    db.commit()
    db.refresh(exercise1)
    db.refresh(exercise2)
    
    # Add exercises to the plan with initial order
    plan_exercise1 = PlanExercise(
        workout_plan_id=plan.id,
        exercise_id=exercise1.id,
        sets=3,
        reps=10,
        rest_seconds=60,
        target_weight=50.0,
        order=1
    )
    db.add(plan_exercise1)
    
    plan_exercise2 = PlanExercise(
        workout_plan_id=plan.id,
        exercise_id=exercise2.id,
        sets=3,
        reps=10,
        rest_seconds=60,
        target_weight=50.0,
        order=2
    )
    db.add(plan_exercise2)
    db.commit()
    
    # Reorder exercises (swap the order)
    reorder_data = [
        {"exercise_id": exercise1.id, "new_order": 2},
        {"exercise_id": exercise2.id, "new_order": 1}
    ]
    
    response = client.post(
        f"/api/plans/{plan.id}/exercises/reorder",
        json=reorder_data,
        headers=user_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verify the order was updated in the database
    db_plan_exercise1 = db.query(PlanExercise).filter(
        PlanExercise.workout_plan_id == plan.id,
        PlanExercise.exercise_id == exercise1.id
    ).first()
    
    db_plan_exercise2 = db.query(PlanExercise).filter(
        PlanExercise.workout_plan_id == plan.id,
        PlanExercise.exercise_id == exercise2.id
    ).first()
    
    assert db_plan_exercise1.order == 2
    assert db_plan_exercise2.order == 1
    
    # Verify the response contains the updated plan with exercises in the new order
    plan_data = response.json()
    exercises = sorted(plan_data["exercises"], key=lambda x: x["order"])
    assert exercises[0]["exercise_id"] == exercise2.id
    assert exercises[1]["exercise_id"] == exercise1.id 