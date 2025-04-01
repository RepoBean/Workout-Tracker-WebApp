#!/bin/bash
set -e

# Function to check if database is ready
wait_for_db() {
    echo "Waiting for database to be ready..."
    # Use pg_isready utility which is included in postgres images
    # If your base image doesn't have it, you might need netcat (nc)
    # Make sure POSTGRES_PASSWORD, POSTGRES_USER, POSTGRES_DB environment variables are available
    until PGPASSWORD=${POSTGRES_PASSWORD:-postgres} pg_isready -h db -p 5432 -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-workout_tracker} -q; do
        >&2 echo "Postgres is unavailable - sleeping"
        sleep 1
    done
    >&2 echo "Postgres is up - continuing"
}

# Wait for the database
wait_for_db

# Run database migrations (if using Alembic - uncomment if needed)
# echo "Running database migrations..."
# alembic upgrade head

# Run database seeding - but don't stop if it fails
# Add checks here if you only want to seed once (e.g., check for a specific table/flag)
echo "Running database seeding (keeping existing data)..."
# Use set +e to prevent script from exiting if seeding fails
set +e
python -m app.seed_data.seed_db --keep-existing
SEED_EXIT_CODE=$?
set -e

if [ $SEED_EXIT_CODE -ne 0 ]; then
    echo "Warning: Seeding process exited with code $SEED_EXIT_CODE"
    echo "This is normal if no users exist yet. Continuing with startup..."
else
    echo "Database seeding finished successfully."
fi

# Start the main application (Uvicorn)
echo "Starting Uvicorn server..."
# Use exec to replace the shell process with the uvicorn process
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
