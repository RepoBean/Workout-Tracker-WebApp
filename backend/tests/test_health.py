from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint(client):
    """Test that the root endpoint returns a welcome message"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Workout Tracker API"} 