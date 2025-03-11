import os
import pytest
from typing import Generator, Dict, Any
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Patch the database connection before importing app
import app.database as db_module

# Create test database engine (SQLite in-memory)
test_engine = create_engine(
    "sqlite:///./test.db",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create test session factory
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Override the engine and SessionLocal in the database module
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal

# Now we can safely import the app and other modules
from app.main import app
from app.database import Base, get_db
from app.models.models import User
from app.services.auth import create_access_token

@pytest.fixture(scope="function")
def db() -> Generator:
    """
    Returns a SQLAlchemy session for testing, 
    creates all tables before yielding and drops them after the test
    """
    # Create tables
    Base.metadata.create_all(bind=test_engine)
    
    # Create a session for the test
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop tables after test to ensure clean state
        Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db) -> Generator:
    """
    Returns a FastAPI TestClient with an overridden dependency
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db) -> Dict[str, Any]:
    """
    Creates a test user and returns user data including password
    """
    from app.services.auth import get_password_hash
    
    # Create user data
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "Password123!",
        "is_admin": False
    }
    
    # Create user in db
    db_user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password=get_password_hash(user_data["password"]),
        is_admin=user_data["is_admin"]
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Add user id to user data
    user_data["id"] = db_user.id
    
    return user_data

@pytest.fixture(scope="function")
def test_admin(db) -> Dict[str, Any]:
    """
    Creates a test admin user and returns user data including password
    """
    from app.services.auth import get_password_hash
    
    # Create admin data
    admin_data = {
        "username": "testadmin",
        "email": "admin@example.com",
        "password": "Password123!",
        "is_admin": True
    }
    
    # Create admin in db
    db_admin = User(
        username=admin_data["username"],
        email=admin_data["email"],
        hashed_password=get_password_hash(admin_data["password"]),
        is_admin=admin_data["is_admin"]
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    
    # Add admin id to admin data
    admin_data["id"] = db_admin.id
    
    return admin_data

@pytest.fixture(scope="function")
def user_token(test_user) -> str:
    """
    Creates a JWT token for the test user
    """
    return create_access_token(
        data={"sub": test_user["username"], "id": test_user["id"], "is_admin": test_user["is_admin"]}
    )

@pytest.fixture(scope="function")
def admin_token(test_admin) -> str:
    """
    Creates a JWT token for the test admin user
    """
    return create_access_token(
        data={"sub": test_admin["username"], "id": test_admin["id"], "is_admin": test_admin["is_admin"]}
    )

@pytest.fixture(scope="function")
def user_headers(user_token) -> Dict[str, str]:
    """
    Returns authorization headers for the test user
    """
    return {"Authorization": f"Bearer {user_token}"}

@pytest.fixture(scope="function")
def admin_headers(admin_token) -> Dict[str, str]:
    """
    Returns authorization headers for the test admin user
    """
    return {"Authorization": f"Bearer {admin_token}"}