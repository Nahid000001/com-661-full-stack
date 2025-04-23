#!/bin/bash

# Function to clean up background processes when the script exits
cleanup() {
    echo "Stopping backend server..."
    kill $BACKEND_PID
    exit 0
}

# Set up trap to call cleanup function when script receives SIGINT (Ctrl+C)
trap cleanup SIGINT

# Start MongoDB if it's not already running (uncomment if needed)
# mongod &
# MONGO_PID=$!

# Start backend server in the background
cd clothing-store-backend
echo "Starting backend server on http://localhost:5000"
python run.py &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend server
cd ../clothing-store-frontend
echo "Starting Angular frontend server..."
npm start

# When npm start finishes, clean up 
cleanup 