# PowerShell script to start both frontend and backend

# Set Python environment
$env:FLASK_APP = "backend/run.py"
$env:FLASK_ENV = "development"

# Check if MongoDB is running
$mongoDB = Get-Process mongod -ErrorAction SilentlyContinue
if ($null -eq $mongoDB) {
    Write-Host "Starting MongoDB..."
    Start-Process -FilePath "mongod" -NoNewWindow
    Start-Sleep -Seconds 5
    Write-Host "MongoDB started"
} else {
    Write-Host "MongoDB is already running"
}

# Start backend server in background
Write-Host "Starting backend server..."
$backendProcess = Start-Process -FilePath "python" -ArgumentList "./backend/run.py" -PassThru -WindowStyle Hidden

# Wait for backend to start
Start-Sleep -Seconds 3
Write-Host "Backend server started on http://localhost:5000"

# Navigate to frontend directory
Set-Location -Path "frontend"
Write-Host "Starting Angular frontend server..."

# Start frontend server
npm start

# When npm start finishes (Ctrl+C), kill the backend process
Stop-Process -Id $backendProcess.Id -Force
Write-Host "Backend server stopped" 