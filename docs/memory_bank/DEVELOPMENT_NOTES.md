# Workout Tracker - Development Notes

## Weight Unit Conversion Improvements (May 23, 2024)

Identified and resolved inconsistencies in the weight conversion system that were causing weights to be displayed incorrectly across different views:

### Issues Found:
1. **Premature Rounding**: Both `convertToPreferred` and `convertFromPreferred` functions in `unitUtils.js` were rounding values during conversion
2. **Inconsistent Displays**: This caused:
   - 100 lbs in workout programs displayed as 99 lbs in active workouts
   - Values entered as 100 lbs would show as 45 kg in set fields
   - Completed workouts would show 97 lbs for exercises done with 100 lbs weights

### Solutions Implemented:
1. **Separated Conversion from Display**:
   - Removed rounding from core conversion functions (`convertToPreferred` and `convertFromPreferred`)
   - Added a new `formatWeightForDisplay` function that handles rounding only at display time
   - Ensures precise values are stored in the database and used in calculations

2. **Removed Special Case Handling**:
   - Eliminated special handling for certain exercises
   - Standardized the weight conversion logic to be consistent across all exercise types

3. **Updated UI Components**:
   - Updated components to use the new `formatWeightForDisplay` function
   - Ensures weights are displayed consistently throughout the application

This change better adheres to best practices by:
- Storing weights in a consistent unit (kg) in the database
- Performing precise conversions between units without premature rounding
- Only applying rounding for display purposes

## Database Schema Enhancement - Session Exercises (March 14, 2024)

Enhanced the `session_exercises` table in the database schema to properly store workout target values:

- Added `target_weight` (FLOAT) column to store target weights from workout plans
- Added `target_reps` (INTEGER) column to store target repetitions from plans
- Added `rest_seconds` (INTEGER) column to store recommended rest periods
- Added `sets_count` (INTEGER) column to store the number of sets to complete

These additions ensure that when a workout session is created from a plan, the target values are properly stored in the database and available throughout the session. This fixed an issue where target values were only stored temporarily in memory but not persisted to the database.

The changes included:
1. Updating the database model in SQLAlchemy
2. Improving the workout session creation to filter plan exercises by day_of_week
3. Simplifying the session retrieval code by using stored values instead of temporary attributes

## Development Environment

### Docker Container Issues

#### Editing Files While Containers Are Running

**Issue**: When editing files that are mounted as volumes in a Docker container while the container is running, permission conflicts can occur, making it difficult to stop or restart the containers.

**Symptoms**:
- "Permission denied" errors when trying to stop/restart containers
- Container restart failures after code changes

**Causes**:
- Container processes running as different users than the host user
- File locks held by processes inside the container
- Modified file ownership/permissions by the container

**Solutions**:
1. Force stop the containers:
   ```bash
   sudo docker compose kill
   ```

2. Remove the containers:
   ```bash
   sudo docker compose rm -f
   ```

3. Start the containers again:
   ```bash
   sudo docker compose up -d
   ```

4. If the above doesn't work, a system reboot may be necessary to clear lingering file locks.

## Frontend Development

### Missing React Components

**Issue**: When implementing new components that reference other custom components, errors can occur if those dependencies haven't been created yet.

**Solution**: Ensure all component dependencies are created before using them, or create missing components when errors occur.

### API Error Handling

The application uses a centralized error handling approach with the `handleApiError` utility function. This function:

1. Extracts error messages from API responses
2. Provides consistent formatting
3. Optionally updates error state in components

If extending API endpoints, ensure proper error handling by using this utility:

```javascript
import { handleApiError } from '../utils/api';

try {
  // API call
} catch (error) {
  const errorMessage = handleApiError(error, setError, 'Default message');
  // Handle error
}
```

## Dependency Management

### Adding New Dependencies

When adding new dependencies to the frontend:

1. Install the dependency in the Docker container:
   ```bash
   docker compose exec frontend npm install [package-name] --save
   ```

2. Rebuild the frontend container if needed:
   ```bash
   docker compose up -d --build frontend
   ```

3. Update the IMPLEMENTATION_SUMMARY.md file to document the new dependency.

## Troubleshooting Checklist

When encountering issues with the application:

1. Check browser console for JavaScript errors
2. Examine Docker container logs:
   ```bash
   docker compose logs frontend
   docker compose logs backend
   ```

3. Verify API endpoints using the browser's network tab or a tool like Postman
4. Check for missing dependencies in package.json
5. Ensure all required components and utilities are properly exported/imported

## Code Organization

To maintain code quality and consistency:

1. Follow the established component structure
2. Use Material UI components for UI elements
3. Implement proper loading and error states
4. Ensure responsive design for all components
5. Document significant changes in the memory bank 

## Known Issues

### Workout Plan Creation Workflow

1. **Unassigned Days Option**: The UI allows adding exercises to "Unassigned days" which is confusing and may not be necessary.
2. **Day Selection Inconsistency**: When configuring exercises after selecting a specific day, the UI still allows changing the workout day.

### Active Workout Session Problems

1. **Missing Exercise Information**: 
   - Exercise names not displayed during active workout sessions
   - No indication of total sets/reps or target weight

2. **Set Management Issues**:
   - Cannot add multiple sets for an exercise
   - Weights and reps not auto-populated from plan configuration

3. **Workout Flow**:
   - Exercise progression is rigid without ability to navigate between exercises
   - Limited feedback during workout session

## Frontend Testing

### Effective Component Testing

**Best Practices for Frontend Tests**:
1. **Mock order matters**: Define mocks before importing the modules that use them
   ```javascript
   // First define mocks
   jest.mock('react-router-dom', () => ({
     ...jest.requireActual('react-router-dom'),
     useNavigate: () => mockedNavigate,
   }));

   // Then import modules
   import { useNavigate } from 'react-router-dom';
   ```

2. **Use fake timers for timeouts**:
   ```javascript
   // In beforeEach
   jest.useFakeTimers();
   
   // In tests with timeouts
   await act(async () => {
     jest.advanceTimersByTime(2000);
   });
   
   // In afterEach
   jest.useRealTimers();
   ```

3. **Mock child components to isolate testing**:
   ```javascript
   jest.mock('../../components/ChildComponent', () => {
     return {
       __esModule: true,
       default: jest.fn().mockImplementation(({ onClose, onSelect }) => (
         <div data-testid="mock-component">
           <button onClick={onSelect}>Select</button>
           <button onClick={onClose}>Cancel</button>
         </div>
       ))
     };
   });
   ```

4. **Use data-testid for targeting elements**:
   ```jsx
   // In component
   <div data-testid="exercise-selector">...</div>
   
   // In test
   expect(screen.getByTestId("exercise-selector")).toBeInTheDocument();
   ```

### Common Testing Issues

1. **Missing act() warning**: Wrap state updates in act():
   ```javascript
   await act(async () => {
     fireEvent.click(button);
   });
   ```

2. **ReferenceError in mocks**: Declare mock variables before using them:
   ```javascript
   // Declare before imports
   const mockedNavigate = jest.fn();
   
   // Then use in mock
   jest.mock('react-router-dom', () => ({
     ...jest.requireActual('react-router-dom'),
     useNavigate: () => mockedNavigate,
   }));
   ```

3. **Import order issues**: Follow this pattern for imports in tests:
   ```javascript
   // 1. React and testing libraries
   import React from 'react';
   import { render, screen, fireEvent } from '@testing-library/react';
   
   // 2. Mock declarations
   jest.mock('../../utils/api');
   
   // 3. Imports of mocked dependencies
   import { api } from '../../utils/api';
   
   // 4. Component under test
   import MyComponent from '../MyComponent';
   ``` 