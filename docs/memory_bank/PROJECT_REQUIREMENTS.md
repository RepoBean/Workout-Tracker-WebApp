# Workout Tracker Application - Project Requirements

## Overview
A self-hosted workout tracking application using Docker Compose, FastAPI (backend), React (frontend), and PostgreSQL. The project is an AI-assisted workout tracker aimed at helping users track their workout progress, follow guided workout sessions, and visualize their fitness journey.

## Core Technology Stack
- **Frontend**: React (with responsive design and PWA capabilities)
- **Backend**: FastAPI
- **Database**: PostgreSQL
- **Deployment**: Docker, Docker Compose

## User Authentication Requirements
- JWT-based authentication system
- First-time setup process that creates an admin user
- Admin functionality to elevate other users to admin status
- Mobile-friendly login/registration flow

## Workout Plan Structure
- Workout plans containing exercises
- Exercises with configurable sets, reps, and target weights
- Support for progression systems:
  - Progressive overload by increasing weight
  - Progressive overload by increasing reps
  - Progression triggered by successful completion of workout goals
- Support for drop sets (descending rep counts, e.g., 10→8→6)
- (Future) Support for supersets and other advanced techniques

## Exercise Database
- Database of common exercises
- User ability to create custom exercises
- Exercise categorization (strength, cardio, flexibility)
- Equipment type tagging

## Guided Workout Experience
- Mobile-optimized exercise flow showing:
  - Current exercise with target reps/weight
  - Ability for users to adjust actual performance (e.g., only did 8 of 10 reps)
  - User can log actual weight used
  - Rest timer with configurable duration (30/60/90s)
  - Clear navigation between exercises

## Data Visualization
- User profile with progress charts
- Line graphs showing:
  - Weight progression for specific exercises
  - Volume progression (weight × reps × sets)
  - Workout frequency
- Exercise history tracking
- Performance metrics compared to targets

## Mobile Experience
- Primary access will be via mobile devices during workouts
- Responsive design optimized for mobile viewports
- PWA capabilities to enable:
  - Offline functionality in gym environments
  - "Add to home screen" for app-like experience
  - Push notifications (future enhancement)

## Data Management
- Export/import workout plans (JSON format)
- Export workout history (CSV format)
- Plan sharing functionality between users
- GDPR-compliant data management with easy removal options

## MVP Implementation Order
1. User authentication system
2. Exercise database creation
3. Workout plan builder interface
4. Guided workout experience with rest timers
5. Basic progress tracking
6. Data visualization
7. Export/import functionality

## Future Enhancements
- Integration with wearable devices
- AI recommendations for progression
- Social features (challenges, shared goals)
- Nutrition tracking
- User image uploads for form verification 