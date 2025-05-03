# Troubleshooting Backend Connectivity Issues

This guide explains how to troubleshoot and resolve the TimeoutError issue that occurs when the frontend tries to fetch data from the backend.

## Common Issue: TimeoutError when Fetching Stores

### Symptoms
- Console error: `TimeoutError: Timeout has occurred`
- Application falls back to dummy data
- Store listings don't show real data from the database

### Root Causes

1. **Backend Not Running**
   - The Flask backend server is not running on port 5000
   - MongoDB connection issues

2. **Network Configuration Issues**
   - CORS configuration problems
   - Firewall blocking connections

## Solutions

### 1. Ensure the Backend is Running

```powershell
# Navigate to the backend directory
cd backend

# Activate the virtual environment (if using one)
# For Windows:
.\venv\Scripts\activate

# Install dependencies (if needed)
pip install -r requirements.txt

# Run the backend server
python run.py
```

The server should display a message indicating it's running on http://0.0.0.0:5000.

### 2. Check MongoDB Connection

Make sure MongoDB is installed and running locally, or that your connection string is correct if using a remote MongoDB instance.

1. Create or check the `.env` file in the backend directory
2. Ensure it has a valid `MONGO_URI` like:
   ```
   MONGO_URI=mongodb://localhost:27017/clothing-store
   ```

### 3. Test Backend Endpoints Directly

Use a browser or a tool like curl to test if the backend API endpoints are responding:

```
http://localhost:5000/health
http://localhost:5000/stores/?page=1&limit=3
```

### 4. Verify CORS Configuration

If you can access the API directly but the frontend can't connect, check the CORS configuration in `backend/app/__init__.py`.

### 5. Adjust Timeouts in Frontend

If the backend is running but responses are slow, you can increase the timeout settings in the store service:

```typescript
// In frontend/src/app/services/store.service.ts
.pipe(
  timeout(30000), // Increase timeout from 10 to 30 seconds
  // Other operators
)
```

## Application Fallback Behavior

The application is designed to gracefully handle backend connectivity issues by:

1. First trying to connect to the real backend
2. Using dummy data if the connection fails
3. Not showing error messages to users

This ensures a smooth user experience even when the backend is unavailable.

## Additional Help

If you're still experiencing issues after trying these solutions, check the following:

1. Backend server logs for errors
2. Network tab in browser dev tools for failed requests
3. MongoDB logs for connection issues 