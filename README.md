# Workout Tracker

A self-hosted workout tracking application that helps users track their workout progress, follow guided workout sessions, and visualize their fitness journey. Built with React, FastAPI, and PostgreSQL, all containerized with Docker.

[SCREENSHOT: Homepage showing workout dashboard with progress charts]

## Features

- **Workout Management**
  - Create and manage custom workout plans
  - Track sets, reps, and weights for each exercise
  - Support for progressive overload tracking
  - Rest timer with configurable duration

[SCREENSHOT: Workout plan creation interface]

- **Exercise Library**
  - Comprehensive database of exercises
  - Custom exercise creation
  - Categorization by muscle groups and equipment
  - Form instructions and tips

[SCREENSHOT: Exercise library with filters and search]

- **Progress Tracking**
  - Weight progression charts
  - Volume tracking
  - Workout frequency visualization
  - Personal records tracking

[SCREENSHOT: Progress tracking dashboard with charts]

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git
- At least 2GB of free RAM
- 1GB of free disk space

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/workout-tracker.git
   cd workout-tracker
   ```

2. Create a `.env` file in the root directory:
   ```bash
   # Required environment variables
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_db_password
   POSTGRES_DB=workout_tracker
   JWT_SECRET=your_jwt_secret
   ```

3. Start the application:
   ```bash
   docker compose up --build
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:8000/docs

### First-Time Setup
1. Create an admin account when prompted on first launch
2. Use the admin interface to:
   - Add exercises to the database
   - Create workout plans
   - Manage users

[SCREENSHOT: First-time setup wizard]

## Data Persistence

The application uses Docker volumes to persist your data:
- Database data is stored in a PostgreSQL volume
- Your data will persist between container restarts
- For backups, you can use standard PostgreSQL backup tools

## Development

### Project Structure
```
workout-tracker/
├── docker-compose.yml
├── .env
├── backend/
│   ├── Dockerfile
│   └── app/
├── frontend/
│   ├── Dockerfile
│   └── src/
└── docs/
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

For bug reports or security concerns, please open an issue on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- All the open source libraries that made this project possible
- The fitness community for inspiration 