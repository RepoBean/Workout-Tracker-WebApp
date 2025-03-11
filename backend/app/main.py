from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os

from app.database import engine, Base, get_db
from app.routers import auth, users, exercises, plans, sessions, progress

# Create the database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Workout Tracker API",
    description="API for the Workout Tracker application",
    version="0.1.0",
)

# Get CORS settings from environment with fallback for development
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
app.include_router(plans.router, prefix="/api/plans", tags=["Workout Plans"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Workout Sessions"])
app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])

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
        # Try to execute a simple query
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}",
        ) 