# Workout Tracker

A self-hosted workout tracking application that helps users track their workout progress, follow guided workout sessions, and visualize their fitness journey. Built with React, FastAPI, and PostgreSQL, all containerized with Docker.

## Features

- **Workout Management**
  - Create and manage custom workout plans
  - Track sets, reps, and weights for each exercise
  - Support for progressive overload tracking
  - Rest timer with configurable duration

- **Exercise Library**
  - Comprehensive database of exercises
  - Custom exercise creation
  - Categorization by muscle groups and equipment
  - Form instructions and tips

- **Progress Tracking**
  - Weight progression charts
  - Volume tracking
  - Workout frequency visualization
  - Personal records tracking

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git
- At least 2GB of free RAM
- 1GB of free disk space

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RepoBean/Workout-Tracker-WebApp.git
   cd Workout-Tracker-WebApp
   ```

2. Set up the environment:
   
   **Option 1: Automatic setup (Recommended)**
   ```bash
   chmod +x setup-env.sh
   ./setup-env.sh
   ```
   
   **Option 2: Manual setup**
   Create a `.env` file in the root directory with the variables shown below:
   ```bash
   # Database
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=workout_tracker
   DATABASE_URL=postgresql://postgres:postgres@db:5432/workout_tracker

   # Backend
   SECRET_KEY=supersecretkey        # This is your JWT secret
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=20160  # ~2 weeks

   # Server IP for remote/mobile testing (change if needed)
   SERVER_IP=your_local_ip_address

   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://${SERVER_IP}:3000

   # API URL for frontend
   API_URL=http://localhost:8000
   ```

   > **Note:** For local testing, you can use the default values shown above. For production, use strong unique passwords and secrets.

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