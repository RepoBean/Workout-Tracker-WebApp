from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from sqlalchemy import text
import time
import logging

from app.database import engine, Base, get_db
from app.routers import auth, users, exercises, plans, sessions, progress, admin

# Create the database tables with retry logic
max_retries = 5
retry_delay = 3  # seconds

for attempt in range(max_retries):
    try:
        Base.metadata.create_all(bind=engine)
        logging.info("Database tables created successfully")
        break
    except Exception as e:
        if attempt < max_retries - 1:
            logging.warning(f"Failed to create tables on attempt {attempt+1}/{max_retries}. Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)
        else:
            logging.error(f"Failed to create tables after {max_retries} attempts: {str(e)}")
            # We'll continue anyway and let the health check report errors

app = FastAPI(
    title="Workout Tracker API",
    description="API for the Workout Tracker application",
    version="0.1.0",
)

# Get CORS settings from environment with fallback for development
# The split(",") creates a list of strings from the comma-separated env var
allowed_origins_list = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Print loaded origins for debugging (optional, can be removed later)
print(f"Configuring CORS with allowed origins: {allowed_origins_list}")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,  # <-- Use the variable loaded from .env
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
app.include_router(plans.router, prefix="/api/plans", tags=["Workout Plans"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Workout Sessions"])
app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint to check if the API is running.
    """
    return {"message": "Welcome to the Workout Tracker API"}

@app.get("/api/health", tags=["Health"])
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint to verify the API and database connection are working.
    """
    try:
        # Try to execute a simple query using SQLAlchemy's text() function
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}",
        ) 