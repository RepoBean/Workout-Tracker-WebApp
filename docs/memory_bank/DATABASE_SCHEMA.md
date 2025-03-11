# Workout Tracker - Database Schema

## Overview
The database schema is designed to support workout tracking, user management, and performance analysis. PostgreSQL is used as the relational database management system.

## Entity Relationship Diagram (Conceptual)
```
                ┌───────────┐
                │           │
                │   Users   │
                │           │
                └─────┬─────┘
                      │
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐        ┌─────────▼──────┐
│                │        │                │
│  Workout Plans │        │Workout Sessions│
│                │        │                │
└───────┬────────┘        └────────┬───────┘
        │                          │
        │                          │
┌───────▼────────┐        ┌────────▼───────┐       ┌─────────────┐
│                │        │                │       │             │
│ Plan Exercises │        │Session Exercises│◄──────►  Exercises  │
│                │        │                │       │             │
└───────┬────────┘        └────────┬───────┘       └─────────────┘
                                   │
                                   │
                          ┌────────▼───────┐
                          │                │
                          │ Exercise Sets  │
                          │                │
                          └────────────────┘
```

## Table Definitions

### `users`
Stores user account information.

| Column            | Type      | Constraints                | Description                        |
|-------------------|-----------|----------------------------|------------------------------------|
| id                | INTEGER   | PRIMARY KEY, AUTO INCREMENT| Unique identifier                  |
| username          | VARCHAR   | UNIQUE, NOT NULL          | User's username                    |
| email             | VARCHAR   | UNIQUE, NOT NULL          | User's email address               |
| hashed_password   | VARCHAR   | NOT NULL                  | Securely hashed password           |
| is_admin          | BOOLEAN   | NOT NULL, DEFAULT FALSE   | Administrator status               |
| created_at        | TIMESTAMP | NOT NULL, DEFAULT NOW()   | Account creation timestamp         |
| last_login        | TIMESTAMP |                           | Last login timestamp               |
| profile_picture   | VARCHAR   |                           | URL to profile picture (optional)  |

### `exercises`
Stores exercise definitions.

| Column            | Type      | Constraints                | Description                        |
|-------------------|-----------|----------------------------|------------------------------------|
| id                | INTEGER   | PRIMARY KEY, AUTO INCREMENT| Unique identifier                  |
| name              | VARCHAR   | NOT NULL                  | Name of the exercise               |
| description       | TEXT      |                           | Description of the exercise        |
| category          | VARCHAR   |                           | Exercise category (strength, cardio)|
| equipment         | VARCHAR   |                           | Required equipment                 |
| is_system         | BOOLEAN   | NOT NULL, DEFAULT FALSE   | Whether it's a system exercise     |
| created_by        | INTEGER   | FOREIGN KEY (users.id)    | User who created the exercise      |
| created_at        | TIMESTAMP | NOT NULL, DEFAULT NOW()   | Creation timestamp                 |
| muscle_group      | VARCHAR   |                           | Primary muscle group targeted      |
| instructions      | TEXT      |                           | How to perform the exercise        |

### `workout_plans`
Stores workout plan information.

| Column            | Type      | Constraints                | Description                        |
|-------------------|-----------|----------------------------|------------------------------------|
| id                | INTEGER   | PRIMARY KEY, AUTO INCREMENT| Unique identifier                  |
| name              | VARCHAR   | NOT NULL                  | Name of the workout plan           |
| description       | TEXT      |                           | Description of the workout plan    |
| created_at        | TIMESTAMP | NOT NULL, DEFAULT NOW()   | Creation timestamp                 |
| owner_id          | INTEGER   | FOREIGN KEY (users.id)    | User who created the plan          |
| is_public         | BOOLEAN   | NOT NULL, DEFAULT FALSE   | Whether the plan is publicly shared|
| days_per_week     | INTEGER   |                           | Recommended days per week          |
| duration_weeks    | INTEGER   |                           | Recommended plan duration in weeks |

### `plan_exercises`
Maps exercises to workout plans with specific parameters.

| Column            | Type      | Constraints                | Description                        |
|-------------------|-----------|----------------------------|------------------------------------|
| id                | INTEGER   | PRIMARY KEY, AUTO INCREMENT| Unique identifier                  |
| workout_plan_id   | INTEGER   | FOREIGN KEY (workout_plans.id) | Associated workout plan       |
| exercise_id       | INTEGER   | FOREIGN KEY (exercises.id) | Associated exercise                |
| sets              | INTEGER   | NOT NULL                  | Number of sets                     |
| reps              | INTEGER   | NOT NULL                  | Number of reps                     |
| rest_seconds      | INTEGER   |                           | Rest time between sets in seconds  |
| target_weight     | FLOAT     |                           | Target weight (if applicable)      |
| order             | INTEGER   | NOT NULL                  | Order in the workout plan          |
| day_of_week       | INTEGER   |                           | Day number in split routine        |
| progression_type  | VARCHAR   |                           | Weight/rep progression type        |
| progression_value | FLOAT     |                           | Value to increase after success    |
| progression_threshold | INTEGER |                         | Successful completions before progression |

### `workout_sessions`
Records workout sessions performed by users.

| Column            | Type      | Constraints                | Description                        |
|-------------------|-----------|----------------------------|------------------------------------|
| id                | INTEGER   | PRIMARY KEY, AUTO INCREMENT| Unique identifier                  |
| user_id           | INTEGER   | FOREIGN KEY (users.id)    | User who performed the session     |
| workout_plan_id   | INTEGER   | FOREIGN KEY (workout_plans.id) | Associated workout plan       |
| start_time        | TIMESTAMP | NOT NULL, DEFAULT NOW()   | When the session started           |
| end_time          | TIMESTAMP |                           | When the session ended             |
| notes             | TEXT      |                           | User notes about the session       |
| rating            | INTEGER   |                           | User rating of session (1-5)       |
| day_of_week       | INTEGER   |                           | Day of week (1-7)                  |

### `session_exercises`
Records exercises performed during workout sessions.

| Column            | Type      | Constraints                | Description                        |
|-------------------|-----------|----------------------------|------------------------------------|
| id                | INTEGER   | PRIMARY KEY, AUTO INCREMENT| Unique identifier                  |
| session_id        | INTEGER   | FOREIGN KEY (workout_sessions.id) | Associated session         |
| exercise_id       | INTEGER   | FOREIGN KEY (exercises.id) | Associated exercise                |
| sets_completed    | INTEGER   | NOT NULL                  | Number of sets completed           |
| order             | INTEGER   | NOT NULL                  | Order in the session               |
| notes             | TEXT      |                           | Notes about the exercise           |

### `exercise_sets`
Records individual sets within a session exercise.

| Column            | Type      | Constraints                | Description                        |
|-------------------|-----------|----------------------------|------------------------------------|
| id                | INTEGER   | PRIMARY KEY, AUTO INCREMENT| Unique identifier                  |
| session_exercise_id | INTEGER | FOREIGN KEY (session_exercises.id) | Associated session exercise |
| reps              | INTEGER   | NOT NULL                  | Number of reps completed           |
| weight            | FLOAT     |                           | Weight used (if applicable)        |
| set_number        | INTEGER   | NOT NULL                  | Set number                         |
| completed_at      | TIMESTAMP | NOT NULL, DEFAULT NOW()   | When the set was completed         |
| is_warmup         | BOOLEAN   | NOT NULL, DEFAULT FALSE   | Whether it's a warmup set          |
| perceived_effort  | INTEGER   |                           | RPE (Rate of Perceived Exertion)   |

### `shared_plans`
Tracks workout plans shared between users.

| Column            | Type      | Constraints                | Description                        |
|-------------------|-----------|----------------------------|------------------------------------|
| id                | INTEGER   | PRIMARY KEY, AUTO INCREMENT| Unique identifier                  |
| plan_id           | INTEGER   | FOREIGN KEY (workout_plans.id) | Shared workout plan           |
| owner_id          | INTEGER   | FOREIGN KEY (users.id)    | Plan owner                         |
| shared_with_id    | INTEGER   | FOREIGN KEY (users.id)    | User with whom plan is shared      |
| shared_at         | TIMESTAMP | NOT NULL, DEFAULT NOW()   | When the plan was shared           |
| can_edit          | BOOLEAN   | NOT NULL, DEFAULT FALSE   | Whether the user can edit the plan |

## Indexes

- `users_email_idx` on `users(email)`
- `users_username_idx` on `users(username)`
- `exercises_name_idx` on `exercises(name)`  
- `exercises_category_idx` on `exercises(category)`
- `workout_plans_owner_idx` on `workout_plans(owner_id)`
- `workout_sessions_user_idx` on `workout_sessions(user_id)`
- `workout_sessions_date_idx` on `workout_sessions(start_time)`
- `session_exercises_session_idx` on `session_exercises(session_id)`
- `plan_exercises_plan_idx` on `plan_exercises(workout_plan_id)`

## Relationships

- A User can create many Workout Plans (one-to-many)
- A User can have many Workout Sessions (one-to-many)
- A Workout Plan consists of many Plan Exercises (one-to-many)
- An Exercise can be used in many Plan Exercises (one-to-many)
- A Workout Session consists of many Session Exercises (one-to-many)
- A Session Exercise records many Exercise Sets (one-to-many)
- A User can share Workout Plans with other Users (many-to-many via shared_plans)

## Data Integrity Constraints

- CASCADE deletion from Workout Plans to Plan Exercises
- CASCADE deletion from Workout Sessions to Session Exercises
- CASCADE deletion from Session Exercises to Exercise Sets  
- RESTRICT deletion of Exercises used in plans
- RESTRICT deletion of Users with active plans or sessions 