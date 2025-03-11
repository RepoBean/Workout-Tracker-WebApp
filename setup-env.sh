#!/bin/bash

# Detect server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# Create a backup of the existing .env file if it exists
if [ -f .env ]; then
  cp .env .env.backup
  echo "Created backup of existing .env file as .env.backup"
fi

# Update the .env file with the detected server IP
cat > .env << EOF
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=workout_tracker
DATABASE_URL=postgresql://postgres:postgres@db:5432/workout_tracker

# Backend
SECRET_KEY=supersecretkey
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server IP for remote/mobile testing (auto-detected)
SERVER_IP=$SERVER_IP

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://${SERVER_IP}:3000

# API URL for frontend
API_URL=http://localhost:8000
EOF

echo "Environment configured with server IP: $SERVER_IP"
echo "To restart the application with the new configuration, run:"
echo "docker compose down && docker compose up -d" 