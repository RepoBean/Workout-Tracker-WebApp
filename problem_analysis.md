# Workout Tracker App - Weight Selection Implementation Issue

## Problem Overview
I've developed a workout tracker app that allows users to create workout plans and track their progress. We've implemented a feature to allow users to set initial weights when they activate a workout plan, rather than waiting until they start a workout at the gym.

## Current Implementation
1. **Frontend Components**: 
   - Created `PlanActivationWeightDialog.js` to display a dialog for setting weights when activating a plan
   - Updated `WorkoutPlans.js` and `WorkoutPlanDetail.js` to show the dialog after activating a plan

2. **Backend Changes**: 
   - Modified `activate_workout_plan` endpoint in `backend/app/routers/plans.py` to:
     - Return plan exercises with the response
     - Create `UserProgramProgress` records for exercises that don't have them
     - Fixed an initial issue with unique constraint violations by checking existing records

3. **Database Model**:
   - `UserProgramProgress` stores user's progress for each exercise in a workout plan
   - Has a unique constraint on (user_id, workout_plan_id, exercise_id)

## Current Issue
- Some workout plans work correctly (e.g., "Beginner Full Body 3-Day")
- Other plans still encounter errors (e.g., "Full Body Strength 3-Day") with:
  - 500 Internal Server Error
  - CORS errors: "No 'Access-Control-Allow-Origin' header is present"
  - Previous logs showed unique constraint violations when creating UserProgramProgress records

## Environment
- Frontend: React running on port 3000
- Backend: FastAPI running on port 8000
- Database: PostgreSQL
- All services running in Docker containers
- CORS is configured in `main.py` to allow connections from `http://localhost:3000` and `http://192.168.123.60:3000`

## Diagnostics Needed
1. What is causing the 500 error when activating specific workout plans?
2. Why are we seeing CORS errors despite having CORS configured correctly?
3. Are there still issues with the unique constraint handling in `activate_workout_plan`?
4. Are there any differences between the plans that work and those that don't?

## Desired Outcome
Create a plan to fix these issues so that all workout plans can be activated, the weight selection dialog appears properly, and users can set their initial weights when activating a plan, before they start a workout. 