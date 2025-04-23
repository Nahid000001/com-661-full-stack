# PowerShell script to start both frontend and backend

# Start MongoDB if it's not already running (uncomment if needed)
# Start-Process -FilePath "mongod" -NoNewWindow

# Start backend server in background
$backendProcess = Start-Process -FilePath "python" -ArgumentList ".\clothing-store-backend\run.py" -PassThru -WindowStyle Hidden

# Wait a bit for backend to start
Start-Sleep -Seconds 3
Write-Host "Backend server started on http://localhost:5000"

# Start frontend server
Set-Location -Path ".\clothing-store-frontend"
Write-Host "Starting Angular frontend server..."
npm start

# When npm start finishes (Ctrl+C), kill the backend process
Stop-Process -Id $backendProcess.Id -Force
Write-Host "Backend server stopped" 