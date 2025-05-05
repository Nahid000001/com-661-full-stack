# PowerShell script to create the .env file for the backend
$ErrorActionPreference = "Stop"

Write-Host "Creating .env file for backend..." -ForegroundColor Cyan

# MongoDB connection string input
Write-Host "`nEnter your MongoDB Atlas connection string" -ForegroundColor Yellow
Write-Host "Example: mongodb+srv://username:password@cluster.mongodb.net/clothing-store" -ForegroundColor Yellow
$mongoUri = Read-Host "MongoDB URI"

# Validate MongoDB URI
if (-not $mongoUri -or -not $mongoUri.StartsWith("mongodb")) {
    Write-Host "Error: Invalid MongoDB URI. It should start with 'mongodb://' or 'mongodb+srv://'" -ForegroundColor Red
    exit 1
}

# JWT Secret key
Write-Host "`nEnter a JWT secret key (or press Enter for a generated one)" -ForegroundColor Yellow
$jwtSecret = Read-Host "JWT Secret Key"

if (-not $jwtSecret) {
    $jwtSecret = "dev-secret-key-" + [Guid]::NewGuid().ToString().Substring(0, 8)
    Write-Host "Using generated JWT secret: $jwtSecret" -ForegroundColor Yellow
}

# Create .env file content
$envContent = @"
MONGO_URI=$mongoUri
JWT_SECRET_KEY=$jwtSecret
"@

# Save to .env file in backend directory
try {
    # Ensure backend directory exists
    if (-not (Test-Path "backend")) {
        Write-Host "Error: Backend directory not found!" -ForegroundColor Red
        exit 1
    }
    
    # Write to .env file
    Set-Content -Path "backend/.env" -Value $envContent
    Write-Host "`n.env file created successfully in the backend directory" -ForegroundColor Green
    Write-Host "Path: $(Resolve-Path 'backend/.env')" -ForegroundColor Green
} catch {
    Write-Host "Error creating .env file: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Start the backend server: cd backend && python run.py" -ForegroundColor Yellow
Write-Host "2. Start the frontend server: cd frontend && npm start" -ForegroundColor Yellow 