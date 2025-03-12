import pytest
from fastapi import status

def test_register_user(client):
    """Test user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "Password123!"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "id" in data
    assert "password" not in data
    assert "hashed_password" not in data

def test_first_user_is_admin(client):
    """Test that the first user to register is made an admin"""
    response = client.post(
        "/api/auth/register",
        json={
            "username": "firstuser",
            "email": "firstuser@example.com",
            "password": "Password123!"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_admin"] == True
    
    # Second user should not be admin
    response = client.post(
        "/api/auth/register",
        json={
            "username": "seconduser",
            "email": "seconduser@example.com",
            "password": "Password123!"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_admin"] == False

def test_register_duplicate_username(client):
    """Test that registering with an existing username fails"""
    # Register a user first
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "Password123!"
        }
    )
    
    # Try to register with the same username
    response = client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "different@example.com",
            "password": "Password123!"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username already registered" in response.json()["detail"]

def test_login_success(client):
    """Test successful login"""
    # Register a user first
    client.post(
        "/api/auth/register",
        json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "Password123!"
        }
    )
    
    # Login with the user
    response = client.post(
        "/api/auth/login",
        data={
            "username": "loginuser",
            "password": "Password123!"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_username(client):
    """Test login with invalid username"""
    response = client.post(
        "/api/auth/login",
        data={
            "username": "nonexistentuser",
            "password": "Password123!"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]

def test_login_invalid_password(client):
    """Test login with invalid password"""
    # Register a user first
    client.post(
        "/api/auth/register",
        json={
            "username": "passworduser",
            "email": "password@example.com",
            "password": "Password123!"
        }
    )
    
    # Try to login with wrong password
    response = client.post(
        "/api/auth/login",
        data={
            "username": "passworduser",
            "password": "WrongPassword123!"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]

def test_update_user_settings(client, user_headers):
    """Test updating user settings with unit preferences"""
    # Update settings with unit preference
    response = client.patch(
        "/api/users/me",
        json={
            "settings": {
                "unitSystem": "imperial"
            }
        },
        headers=user_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["settings"]["unitSystem"] == "imperial"
    
    # Verify settings persist when fetching user data
    response = client.get(
        "/api/users/me",
        headers=user_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["settings"]["unitSystem"] == "imperial" 