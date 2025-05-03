#!/bin/bash

# Shell script to start both frontend and backend

# Set Python environment
export FLASK_APP="backend/run.py"
export FLASK_ENV="development"

# Check if MongoDB is running
if pgrep mongod > /dev/null
then
    echo "MongoDB is already running"
else
    echo "Starting MongoDB..."
    mongod --fork --logpath /tmp/mongodb.log
    sleep 5
    echo "MongoDB started"
fi

# Start backend server in background
echo "Starting backend server..."
python backend/run.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3
echo "Backend server started on http://localhost:5000"

# Navigate to frontend directory
cd frontend
echo "Starting Angular frontend server..."

# Start frontend server
npm start

# When frontend server stops, kill the backend process
kill $BACKEND_PID
echo "Backend server stopped" 