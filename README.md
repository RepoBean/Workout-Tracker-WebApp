# Workout Tracker

A self-hosted workout tracking application built with FastAPI, React, and PostgreSQL, containerized with Docker Compose.

![Workout Tracker](https://via.placeholder.com/800x400?text=Workout+Tracker)

## Overview

Workout Tracker is a comprehensive fitness tracking application designed to help users:
- Create and manage workout plans
- Track workout sessions with guided exercise flows
- Monitor progress through data visualization
- Share workout plans with others

The application is optimized for mobile use during workouts and features a responsive design with Progressive Web App capabilities.

## Current Implementation Status

### Backend (FastAPI)
- ✅ User authentication with JWT
- ✅ User management
- ✅ Exercise management
- ✅ Workout plan management
- ✅ Workout session tracking
- ✅ Progress tracking endpoints
- ⏳ Database migrations (planned)
- ⏳ Seed data for exercises (planned)

### Frontend (React)
- ✅ Authentication (login/register)
- ✅ Responsive layouts
- ✅ Dashboard page
- ✅ Protected routes
- ✅ Material UI theming
- ⏳ Workout plan pages (in progress)
- ⏳ Exercise management pages (in progress)
- ⏳ Workout session pages (in progress)
- ⏳ Progress visualization (planned)

### Containerization
- ✅ Docker and Docker Compose configuration
- ✅ Development environment
- ⏳ Production configuration (planned)

## Features

- **User Authentication**
  - Secure registration and login
  - Role-based access (admin/regular users)
  - First-user-creates-admin approach

- **Exercise Management**
  - Pre-populated exercise database
  - Custom exercise creation
  - Exercise categorization

- **Workout Planning**
  - Create customized workout plans
  - Configure sets, reps, and weights
  - Support for progression systems
  - Drop sets support

- **Guided Workouts**
  - Step-by-step exercise guidance
  - Rest timers
  - Weight and rep tracking
  - Mobile-optimized interface

- **Progress Tracking**
  - Weight progression charts
  - Volume tracking
  - Workout frequency visualization
  - Personal records tracking

- **Data Management**
  - Export/import workout plans (JSON)
  - Export workout history (CSV)
  - Plan sharing between users

- **Mobile Experience**
  - Responsive design
  - Progressive Web App capabilities
  - Offline functionality

## Technology Stack

- **Frontend:** React with Material UI
- **Backend:** FastAPI
- **Database:** PostgreSQL
- **Containerization:** Docker, Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your system
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/workout-tracker.git
   cd workout-tracker
   ```

2. Start the application:
   ```
   docker compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### First-Time Setup

On first launch, you'll be prompted to create an admin account. This account will have special privileges for managing the application.

## Development

### Project Structure

```
workout-tracker/
├── docker-compose.yml
├── .env
├── backend/
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   └── services/
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
└── docs/
    └── memory_bank/
```

### Documentation

Comprehensive documentation is available in the `docs/memory_bank` directory:

- [Project Requirements](docs/memory_bank/PROJECT_REQUIREMENTS.md)
- [System Architecture](docs/memory_bank/SYSTEM_ARCHITECTURE.md)
- [Database Schema](docs/memory_bank/DATABASE_SCHEMA.md)
- [Development Roadmap](docs/memory_bank/DEVELOPMENT_ROADMAP.md)
- [User Flows](docs/memory_bank/USER_FLOWS.md)

## Contributing

Contributions are welcome! Please see the [Development Roadmap](docs/memory_bank/DEVELOPMENT_ROADMAP.md) for planned features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- All the open source libraries that made this project possible
- The fitness community for inspiration 