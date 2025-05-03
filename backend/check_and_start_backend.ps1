# PowerShell script to check and start the backend

Write-Host "Checking if MongoDB is running..." -ForegroundColor Cyan

# Try to connect to MongoDB
try {
    # This requires the MongoDB command line tools to be installed
    # If you don't have them, you can skip this check
    $mongoStatus = mongod --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "MongoDB is available" -ForegroundColor Green
    } else {
        Write-Host "MongoDB may not be running! Please start MongoDB first." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not verify MongoDB status. Make sure MongoDB is running." -ForegroundColor Yellow
}

Write-Host "Checking if backend is already running on port 5000..." -ForegroundColor Cyan

# Check if something is already using port 5000
$portCheck = netstat -ano | Select-String "5000"
if ($portCheck) {
    Write-Host "Port 5000 is already in use. Backend might be running already." -ForegroundColor Yellow
    Write-Host "Current processes using port 5000:" -ForegroundColor Yellow
    $portCheck
    
    $response = Read-Host "Do you want to kill these processes? (y/n)"
    if ($response -eq "y") {
        # Extract PIDs and kill them
        $portCheck | ForEach-Object {
            if ($_ -match "TCP.+:5000.+LISTENING\s+(\d+)") {
                $processPid = $matches[1]
                Write-Host "Killing process with PID $processPid" -ForegroundColor Red
                Stop-Process -Id $processPid -Force
            }
        }
    }
}

Write-Host "Checking for .env file..." -ForegroundColor Cyan
if (-Not (Test-Path ".env")) {
    Write-Host "Creating .env file with default MongoDB URI..." -ForegroundColor Yellow
    Set-Content ".env" "MONGO_URI=mongodb://localhost:27017/clothing-store`nJWT_SECRET_KEY=dev-secret-key"
} else {
    Write-Host ".env file exists" -ForegroundColor Green
}

Write-Host "Checking virtual environment..." -ForegroundColor Cyan
if (Test-Path "venv") {
    Write-Host "Virtual environment exists" -ForegroundColor Green
    
    # Activate virtual environment
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & .\venv\Scripts\Activate.ps1
    
} else {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    & .\venv\Scripts\Activate.ps1
}

# Install requirements
Write-Host "Installing requirements..." -ForegroundColor Cyan
pip install -r requirements.txt

# Start the backend
Write-Host "Starting the backend..." -ForegroundColor Green
python run.py 