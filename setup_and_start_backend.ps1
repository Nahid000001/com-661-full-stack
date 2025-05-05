# PowerShell script to set up environment and start the backend
$ErrorActionPreference = "Stop"

Write-Host "Setting up backend environment..." -ForegroundColor Cyan

# Navigate to the backend directory
Set-Location -Path "backend"

# Check if .env file exists; if not, create it
if (-Not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    # Prompt for MongoDB connection string
    $mongoUri = Read-Host "Enter your MongoDB Atlas connection string"
    $jwtSecret = Read-Host "Enter a JWT secret key (or press Enter for a default)"
    
    if ($jwtSecret -eq "") {
        $jwtSecret = "dev-secret-key-" + [Guid]::NewGuid().ToString().Substring(0, 8)
        Write-Host "Using generated JWT secret: $jwtSecret" -ForegroundColor Yellow
    }
    
    # Create .env file with the provided values
    $envContent = @"
MONGO_URI=$mongoUri
JWT_SECRET_KEY=$jwtSecret
"@
    
    Set-Content -Path ".env" -Value $envContent
    Write-Host ".env file created successfully" -ForegroundColor Green
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

# Check virtual environment
Write-Host "Checking virtual environment..." -ForegroundColor Cyan
if (-Not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1

# Install requirements
Write-Host "Installing requirements..." -ForegroundColor Cyan
pip install -r requirements.txt

# Start the backend
Write-Host "Starting the backend server..." -ForegroundColor Green
python run.py 