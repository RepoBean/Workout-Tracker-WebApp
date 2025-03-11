# Workout Tracker - System Architecture

## System Overview
The workout tracker is a containerized application with three main components:
- React frontend for user interface
- FastAPI backend for business logic
- PostgreSQL database for data storage

## Implementation Status

As of the current implementation:

- **Backend API**: Core functionality implemented including user authentication, CRUD operations for exercises, workout plans, and workout sessions, plus progress tracking.
- **Frontend UI**: Authentication and basic layouts implemented, dashboard page created.
- **Database Models**: All models defined and relationships established.
- **Containerization**: Docker and Docker Compose configuration completed.

## Architecture Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │◄────►  FastAPI Backend│◄────►   PostgreSQL    │
│  (Container)    │     │  (Container)    │     │   (Container)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Component Details

### Frontend (React)
- **Implemented**:
  - Authentication context with JWT handling
  - Responsive layouts (MainLayout and AuthLayout)
  - Login and registration forms
  - Dashboard page
  - Protected routes
  - Material UI theming
  - PWA manifest

- **Pending**:
  - Workout plan management UI
  - Exercise management UI
  - Workout session UI
  - Progress visualization
  - Profile management

- **Key Technologies**:
  - React (UI library)
  - React Router (routing)
  - Material UI (component library)
  - Axios (API requests)
  - Formik & Yup (form validation)
  - JWT-decode (token handling)

### Backend (FastAPI)
- **Implemented**:
  - RESTful API endpoints for all core functionality
  - JWT authentication
  - Database models and schemas
  - User management
  - Exercise management
  - Workout plan management
  - Workout session tracking
  - Progress tracking endpoints

- **Pending**:
  - Database migrations with Alembic
  - Seed data for exercises
  - Password reset functionality
  - Comprehensive error handling

- **Key Technologies**:
  - FastAPI (API framework)
  - SQLAlchemy (ORM)
  - Pydantic (data validation)
  - PyJWT (authentication)
  - PostgreSQL (database)

### Database (PostgreSQL)
- **Implemented**:
  - All database tables and relationships defined
  - Indexes for performance optimization

- **Pending**:
  - Database migrations
  - Seed data

- **Primary Tables**:
  - Users
  - Exercises
  - Workout Plans
  - Plan Exercises 
  - Workout Sessions
  - Session Exercises
  - Exercise Sets
  - Shared Plans

## API Structure

### Authentication Endpoints
- POST `/api/auth/register` - User registration (Implemented)
- POST `/api/auth/login` - User login (Implemented)
- POST `/api/auth/refresh` - Refresh token (Planned)
- POST `/api/auth/logout` - User logout (Planned)

### User Endpoints
- GET `/api/users/me` - Get current user (Implemented)
- PATCH `/api/users/me` - Update user profile (Implemented)
- GET `/api/users/{id}` - Get user by ID (admin only) (Implemented)
- PATCH `/api/users/{id}/role` - Update user role (admin only) (Implemented)

### Exercise Endpoints
- GET `/api/exercises` - List exercises (Implemented)
- POST `/api/exercises` - Create exercise (Implemented)
- GET `/api/exercises/{id}` - Get exercise by ID (Implemented)
- PUT `/api/exercises/{id}` - Update exercise (Implemented)
- DELETE `/api/exercises/{id}` - Delete exercise (Implemented)
- GET `/api/exercises/categories/list` - List exercise categories (Implemented)
- GET `/api/exercises/equipment/list` - List exercise equipment (Implemented)
- GET `/api/exercises/muscle-groups/list` - List muscle groups (Implemented)

### Workout Plan Endpoints
- GET `/api/plans` - List workout plans (Implemented)
- POST `/api/plans` - Create workout plan (Implemented)
- GET `/api/plans/{id}` - Get workout plan by ID (Implemented)
- PUT `/api/plans/{id}` - Update workout plan (Implemented)
- DELETE `/api/plans/{id}` - Delete workout plan (Implemented)
- POST `/api/plans/{id}/clone` - Clone existing plan (Implemented)
- POST `/api/plans/{id}/exercises` - Add exercise to plan (Implemented)
- PUT `/api/plans/{id}/exercises/{exercise_id}` - Update plan exercise (Implemented)
- DELETE `/api/plans/{id}/exercises/{exercise_id}` - Remove exercise from plan (Implemented)
- POST `/api/plans/{id}/exercises/reorder` - Reorder exercises in plan (Implemented)

### Workout Session Endpoints
- GET `/api/sessions` - List workout sessions (Implemented)
- POST `/api/sessions` - Start new workout session (Implemented)
- GET `/api/sessions/{id}` - Get session by ID (Implemented)
- PATCH `/api/sessions/{id}` - Update session (Implemented)
- DELETE `/api/sessions/{id}` - Delete session (Implemented)
- POST `/api/sessions/{id}/exercises` - Add exercise to session (Implemented)
- PUT `/api/sessions/{id}/exercises/{exercise_id}` - Update session exercise (Implemented)
- DELETE `/api/sessions/{id}/exercises/{exercise_id}` - Remove exercise from session (Implemented)
- POST `/api/sessions/{id}/exercises/{exercise_id}/sets` - Add set to exercise (Implemented)
- PUT `/api/sessions/{id}/exercises/{exercise_id}/sets/{set_id}` - Update set (Implemented)
- DELETE `/api/sessions/{id}/exercises/{exercise_id}/sets/{set_id}` - Delete set (Implemented)
- POST `/api/sessions/{id}/end` - End workout session (Implemented)

### Progress Endpoints
- GET `/api/progress/exercises/{id}` - Get progress for specific exercise (Implemented)
- GET `/api/progress/volume` - Get volume progression (Implemented)
- GET `/api/progress/frequency` - Get workout frequency stats (Implemented)
- GET `/api/progress/personal-records` - Get personal records (Implemented)
- GET `/api/progress/summary` - Get workout summary stats (Implemented)

## Containerization Strategy
- Docker Compose for orchestration (Implemented)
- Three containers: Frontend, Backend, PostgreSQL (Implemented)
- Shared volumes for development (Implemented)
- Environment variables for configuration (Implemented)
- Persistent volume for database data (Implemented)

## Security Considerations
- JWT for authentication (Implemented)
- Password hashing with bcrypt (Implemented)
- CORS configuration (Implemented)
- Role-based access control (Implemented)
- Input validation with Pydantic (Implemented)

## Next Implementation Steps
1. Complete frontend UI components for all pages
2. Implement database migrations with Alembic
3. Add seed data for exercises
4. Enhance error handling and validation
5. Implement service workers for offline capabilities

## Performance Considerations
- Database indexing
- API request caching
- Lazy loading of components
- Optimized database queries

## Deployment Considerations  
- Production vs development environments
- Backup strategy
- Scaling strategy
- Monitoring and logging 