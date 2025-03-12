# Workout Tracker - Workout Plan Implementation Guide

## Key Files to Review for Workout Plan Functionality

When addressing issues or implementing features related to workout plans, review these files in order of importance:

1. **DATABASE_SCHEMA.md** - Contains the data model for workout plans, exercises, and user relationships. Pay special attention to fields related to active plans, target weights, and the relationship between plans and exercises.

2. **IMPLEMENTATION_SUMMARY.md** - Provides the current state of implementation, helping identify which features are complete versus partially implemented. Review the sections on Workout Plans and API Endpoints.

3. **USER_FLOWS.md** - Outlines the expected user interactions for creating workout plans, adding exercises, configuring weights/sets/reps, and setting plans as active.

4. **TESTING_IMPLEMENTATION.md** - Details the current testing approach and gaps in workout plan functionality testing.

5. **FRONTEND_COMPONENTS.md** - Describes frontend components that interact with workout plan functionality, including forms for exercise configuration.

6. **SYSTEM_ARCHITECTURE.md** - Provides overall technical architecture, API structures, and data flow patterns.

## Workflow Implementation Details

### Workout Plan Creation Flow

The proper flow for creating workout plans should include:

1. User creates a plan with basic details (name, description)
2. User adds exercises to the plan
3. User configures each exercise with:
   - Sets and reps
   - Target weight
   - Rest periods
   - Order in workout

Data format consistency is crucial between frontend and backend:
- Frontend should use `target_weight` consistently
- Backend uses `target_weight` in database model
- API requests/responses should maintain consistent naming

### Active Workout Plan Logic

The active workout plan functionality should:

1. Allow setting any workout plan as "active" via API endpoint
2. Ensure only one plan can be active at a time per user
3. Deactivate any previously active plan when a new one is activated
4. Display the active plan on the dashboard as "Next Workout"
5. Retrieve active plan via `/api/plans/next` endpoint

### Common Issues to Watch For

1. Field naming inconsistencies between frontend and backend (e.g., `rest_time` vs `rest_seconds`)
2. Missing database columns (requiring database migrations)
3. Incomplete validation in the API endpoints
4. Lack of proper error handling for edge cases
5. Missing tests for critical workflows

## Testing Recommendations

Testing for workout plans should include:

### Backend Tests
- Creating workout plans with and without exercises
- Setting a plan as active and verifying only one is active
- Retrieving the active plan via the next endpoint
- Handling edge cases (no active plan, deleting active plan)

### Frontend Tests
- Form submission for creating plans with exercises
- Exercise configuration dialog with proper weight handling
- Active plan display on dashboard
- Error state handling

## Database Migration Notes

When adding new columns to existing tables:
1. Update models in `models.py`
2. Update schemas in related schema files
3. Run database migration to add columns
4. Restart services to apply changes

This guarantees that the application and database remain in sync. 