# Workout Tracker - User Flows

## First-Time User Experience

### Initial Setup Flow
1. User navigates to the application URL
2. System detects no users exist in the database
3. User is prompted to create the first admin account
   - Enter username, email, password
   - Confirm password
4. System creates admin user and logs them in
5. User is presented with a welcome tour

### New User Registration (After Initial Setup)
1. User navigates to the application URL
2. User clicks "Register"
3. User enters username, email, password
4. System creates regular user account
5. User is logged in and taken to dashboard
6. System shows onboarding tutorial

## Authentication Flows

### Login Flow
1. User navigates to the application URL
2. User enters email/username and password
3. System validates credentials
4. User is redirected to their dashboard
5. System updates last login timestamp

### Password Reset Flow
1. User clicks "Forgot Password" on login screen
2. User enters email address
3. System sends password reset link to email
4. User clicks link in email
5. User enters and confirms new password
6. User is redirected to login with success message

## Workout Plan Management

### Create Workout Plan Flow
1. User navigates to "Workout Plans" section
2. User clicks "Create New Plan"
3. User enters plan name, description, days per week
4. User is taken to plan builder interface
5. User adds exercises to the plan:
   - Searches for exercise
   - Configures sets, reps, rest time, target weight
   - Sets progression parameters (optional)
   - Arranges exercise order
6. User saves the workout plan
7. Plan is added to user's workout plans list

### Edit Workout Plan Flow
1. User navigates to "Workout Plans" section
2. User selects an existing plan
3. User clicks "Edit Plan"
4. User modifies plan details or exercises
5. User saves changes
6. System updates plan in database

### Share Workout Plan Flow
1. User navigates to a workout plan
2. User clicks "Share Plan"
3. User selects sharing options:
   - Make public (anyone can view)
   - Share with specific users (enters usernames/emails)
   - Set edit permissions
4. System creates sharing record
5. Recipients receive notification (if applicable)

### Activate Workout Plan Flow
1. User navigates to a workout plan (either their own or a public plan)
2. User clicks "Set as Active" button
3. System sets this plan as the user's active plan
4. User is shown confirmation that the plan is now active
5. The active plan is displayed on the dashboard as "Next Workout"
6. When starting a new workout, the active plan is selected by default

Note: Multiple users can have the same workout plan set as their active plan, with each user's progress tracked individually.

## Workout Session Flow

### Start Workout Session Flow
1. User navigates to "Start Workout" section
2. User selects a workout plan
3. System initializes a new workout session
4. User is presented with the first exercise
5. For each exercise:
   - System shows name, target sets, reps, weight
   - User performs the exercise
   - User logs actual performance (weight, reps completed)
   - User clicks "Complete Set"
   - After final set, rest timer starts automatically
   - When rest timer completes, system advances to next exercise
6. After final exercise, user is prompted to end session
7. User adds optional session notes and rating
8. System saves the complete workout session

### Sequential Workout Progression Flow
1. User starts a workout with an active plan
2. System determines the next workout day based on user's progress:
   - If no completed sessions, system presents the first day of the plan
   - If user has completed previous workouts, system presents the next day in sequence
   - If user has completed the final day, system loops back to the first day
3. System shows exercises for the determined workout day regardless of the current calendar day
4. User completes the workout as usual
5. On next workout, system advances to the next sequential day in the plan

### Rest Timer Flow
1. User completes a set of an exercise
2. System automatically starts rest timer (default: 60 seconds)
3. User can adjust timer duration (30/60/90 seconds)
4. User can pause/resume timer
5. System plays sound when timer completes
6. User can skip timer by clicking "Next"

### Manual Logging Flow
1. User navigates to "Log Workout" section
2. User selects date and workout plan
3. User manually enters exercises performed
4. For each exercise, user logs sets, reps, and weights
5. User adds optional notes
6. User saves the workout log

## Progress Tracking

### View Progress Flow
1. User navigates to "Progress" section
2. User selects metric to track:
   - Weight progression for specific exercises
   - Volume progression
   - Workout frequency
3. User selects time period (week, month, 3 months, year, all time)
4. System displays appropriate charts and statistics
5. User can export data if desired

### Personal Records Flow
1. User navigates to "Records" section
2. System displays personal records by exercise:
   - Maximum weight for single rep
   - Maximum volume in one set
   - Maximum volume in one session
3. User can filter by exercise category or specific exercise

## Administrative Flows

### User Management Flow (Admin)
1. Admin navigates to "Admin" section
2. Admin selects "User Management"
3. System displays list of users
4. Admin can:
   - View user details
   - Change user roles
   - Reset user passwords
   - Delete users (with confirmation)

### Exercise Management Flow (Admin)
1. Admin navigates to "Admin" section
2. Admin selects "Exercise Management"
3. System displays list of system exercises
4. Admin can:
   - Add new exercises to system
   - Edit existing exercises
   - Categorize exercises
   - Delete exercises (if not in use)

## Data Management

### Export Data Flow
1. User navigates to "Settings" section
2. User selects "Export Data"
3. User chooses what to export:
   - Workout plans (JSON)
   - Workout history (CSV)
   - All data (JSON)
4. System generates export file
5. Browser downloads the file

### Import Data Flow
1. User navigates to "Settings" section
2. User selects "Import Data"
3. User uploads previously exported file
4. System validates file format
5. System imports data
6. System displays success/error message

## Mobile-Specific Flows

### Add to Home Screen Flow
1. User visits application in mobile browser
2. System detects mobile device
3. After several visits, system prompts to add to home screen
4. User accepts prompt
5. App is added to device home screen

### Offline Usage Flow
1. User opens app with no internet connection
2. System detects offline status
3. User can view previously loaded workout plans
4. User can log workouts offline
5. When connection is restored, data is synchronized 