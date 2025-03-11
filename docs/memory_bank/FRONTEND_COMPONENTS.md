# Workout Tracker - Frontend Components

This document provides detailed information about the React components implemented for the Workout Tracker application, including their key features, functionality, and notable implementation details.

## Core Components

### API Utility (api.js)

A centralized API utility that handles all communication with the backend using Axios.

**Key Features:**
- Request/response interceptors for authentication and error handling
- Organized API functions by resource (workouts, plans, exercises, etc.)
- Standardized error handling
- Support for different content types (JSON, form data, blob)

**API Groups:**
- `workoutPlansApi`: Plan management functions
- `sessionsApi`: Workout session tracking
- `exercisesApi`: Exercise library functions
- `progressApi`: Progress tracking and visualization
- `userApi`: User profile and settings

### Dashboard (Dashboard.js)

The main landing page after login that shows personalized workout information.

**Key Features:**
- Next scheduled workout display with quick-start option
- Recent workout history with status indicators
- Progress statistics and personal records
- Quick access cards for common actions

**Key Functions:**
- `fetchNextWorkout()`: Gets the user's next scheduled workout
- `fetchRecentWorkouts()`: Retrieves recent workout sessions
- `fetchProgressStats()`: Gets personal records and workout frequency
- `formatDate()`: Formats dates for display
- `formatDuration()`: Calculates and formats workout duration

### Workout Sessions (WorkoutSessions.js)

Page that displays the user's workout history and provides options to start new sessions.

**Key Features:**
- Filterable list of all workout sessions
- Status indicators (completed, in progress)
- Duration and exercise count metrics
- Delete confirmation

**Key Functions:**
- `fetchWorkoutSessions()`: Retrieves the user's workout sessions
- `handleTabChange()`: Filters sessions by status
- `handleStartWorkout()`: Navigates to workout plan selection
- `handleDeleteSession()`: Removes a workout session
- `formatDuration()`: Calculates duration from start/end times
- `getStatusColor()`: Returns appropriate color for status indicators

### Active Workout (ActiveWorkout.js)

Interactive workout tracking interface for recording exercises, sets, and weights.

**Key Features:**
- Exercise progression with step indicator
- Set/rep/weight tracking with editable fields
- Progress indicator showing completion percentage
- Timer tracking workout duration
- Workout completion flow

**Key Functions:**
- `initializeSession()`: Creates or loads a workout session
- `handleCompleteSet()`: Records completed exercise sets
- `saveSetToBackend()`: Persists set data to the API
- `handleEditSet()`: Enables editing of set data
- `handleNextExercise()`: Progresses to the next exercise
- `handleFinishWorkout()`: Completes the workout session
- `calculateCompletion()`: Determines overall workout completion percentage

### Progress (Progress.js)

Data visualization component for tracking fitness progress over time.

**Key Features:**
- Weight progression charts for exercises
- Volume tracking visualization
- Workout frequency statistics
- Personal records table

**Key Functions:**
- `fetchExercises()`: Gets available exercises for tracking
- `fetchProgressData()`: Retrieves progress data for selected exercise
- `fetchFrequencyData()`: Gets workout frequency statistics
- `fetchPersonalRecords()`: Retrieves personal records
- `renderWeightProgressChart()`: Creates weight progression visualization
- `renderVolumeProgressChart()`: Creates volume progression visualization
- `renderWorkoutFrequencyChart()`: Displays workout frequency by day
- `renderPersonalRecords()`: Shows table of personal records

### Workout Plans (WorkoutPlans.js)

Interface for viewing, creating, and managing workout plans.

**Key Features:**
- Grid view of all workout plans
- Search/filtering functionality
- Plan actions menu (edit, activate, export, delete)
- Import/export functionality

**Key Functions:**
- `fetchWorkoutPlans()`: Retrieves available workout plans
- `handleCreatePlan()`: Navigates to plan creation
- `handleEditPlan()`: Enables plan editing
- `handleDeletePlan()`: Removes a workout plan
- `handleStartWorkout()`: Begins a workout from a plan
- `handleSetActive()`: Marks a plan as the active plan
- `handleExportPlan()`: Exports a plan as JSON
- `handleImportPlan()`: Imports a plan from JSON

### Workout Plan Detail (WorkoutPlanDetail.js)

Interface for viewing details of a single workout plan, including exercises and plan management.

**Key Features:**
- Display plan name, description, and metadata
- List all exercises with sets, reps, and rest periods in a table format
- Set plan as active functionality
- Options to edit or delete the plan
- Button to start a workout using the plan

**Key Functions:**
- `fetchPlanDetails()`: Retrieves plan details by ID
- `formatDate()`: Formats dates for display
- `handleSetActive()`: Sets the plan as the active workout plan
- `handleEditPlan()`: Navigates to plan editing
- `handleDeletePlan()`: Removes the workout plan
- `handleStartWorkout()`: Begins a workout using this plan

### Create Workout Plan (CreateWorkoutPlan.js)

Interface for creating new workout plans.

**Key Features:**
- Form for plan name and description
- Exercise selection with search/filter functionality
- Drag-and-drop exercise reordering
- Exercise configuration (sets, reps, rest time)
- Form validation

**Key Functions:**
- `handleExercisesSelected()`: Adds selected exercises to the plan
- `handleConfigureExercise()`: Opens dialog to configure exercise details
- `handleDragEnd()`: Manages exercise reordering via drag and drop
- `validateForm()`: Ensures required fields are completed
- `handleCreatePlan()`: Submits the plan to the backend

### Edit Workout Plan (EditWorkoutPlan.js)

Interface for modifying existing workout plans.

**Key Features:**
- Pre-filled form with existing plan data
- Exercise management with same features as CreateWorkoutPlan
- Unsaved changes detection
- Save/cancel functionality

**Key Functions:**
- `fetchPlanDetails()`: Retrieves and populates the form with existing plan data
- `handleUpdatePlan()`: Saves changes to the backend
- `handleExercisesSelected()`: Adds/updates exercises in the plan
- `handleDragEnd()`: Manages exercise reordering
- `handleConfigureExercise()`: Configures exercise details

### Exercise Selector (ExerciseSelector.js)

A modal component for selecting exercises to add to workout plans.

**Key Features:**
- Search functionality for exercises
- Filtering by category and muscle group
- Checkbox selection for multiple exercises
- Previews of selected exercises

**Key Functions:**
- `fetchExercises()`: Retrieves exercises from the backend
- `handleToggleExercise()`: Selects/deselects an exercise
- `handleSearchChange()`: Filters exercises by search term
- `handleCategoryChange()`: Filters exercises by category
- `handleMuscleGroupChange()`: Filters exercises by muscle group
- `handleConfirm()`: Passes selected exercises back to the parent component

### Profile (Profile.js)

User profile management and application settings.

**Key Features:**
- Profile information editing
- Application preferences (theme, units)
- Password change functionality
- Account management

**Key Functions:**
- `handleProfileChange()`: Updates profile field values
- `handleSettingsChange()`: Updates application settings
- `handleSaveProfile()`: Persists profile changes
- `handleSaveSettings()`: Saves application settings
- `validatePasswordChange()`: Validates password change requirements
- `handleChangePassword()`: Updates user password
- `handleDeleteAccount()`: Manages account deletion flow

### Exercises (Exercises.js)

Exercise library management with categorization and search.

**Key Features:**
- Exercise list grouped by muscle group
- Search and filtering
- Exercise creation and editing
- Category management

**Key Functions:**
- `fetchExercises()`: Retrieves the exercise library
- `handleCreateExercise()`: Creates a new exercise
- `handleEditExercise()`: Modifies existing exercises
- `handleSaveExercise()`: Persists exercise changes
- `handleDeleteExercise()`: Removes exercises
- `groupExercisesByMuscleGroup()`: Organizes exercises by category

## UI Design Principles

The frontend implementation follows these design principles:

1. **Responsive Design**: All components adapt to different screen sizes using Material UI's responsive utilities.

2. **Consistent Error Handling**: Error states are consistently handled with error messages and retry options.

3. **Loading States**: Visual feedback for asynchronous operations with progress indicators.

4. **Form Validation**: Input validation with helpful error messages.

5. **Confirmation Dialogs**: Destructive actions require confirmation.

6. **Accessibility**: Semantic HTML and proper ARIA attributes for accessibility.

7. **Visual Hierarchy**: Clear visual hierarchy with typography, color, and spacing.

## Frontend Architecture

The frontend follows a component-based architecture:

- **Contexts**: For global state management (AuthContext)
- **Pages**: Full-page components loaded by routes
- **Layouts**: Page structure components
- **API Utils**: Centralized API communication
- **Hooks**: Reusable logic (custom hooks)

## Dependencies

The frontend relies on the following key dependencies:

- **React**: UI library
- **React Router**: Routing
- **Material UI**: Component library
- **Axios**: API requests
- **Chart.js/React-Chartjs-2**: Data visualization

## Next Steps

Planned enhancements for the frontend include:

1. **PWA Implementation**: Service workers for offline support
2. **Testing**: Unit and integration tests
3. **Onboarding**: User onboarding experience
4. **Advanced Visualization**: More detailed progress charts
5. **Bundle Optimization**: Performance improvements for production 