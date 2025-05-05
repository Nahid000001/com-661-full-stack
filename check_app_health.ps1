# PowerShell script to check the health of application components
$ErrorActionPreference = "Continue"

Write-Host "Checking application health..." -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Check MongoDB connection
Write-Host "1. Checking MongoDB Connection..." -ForegroundColor Cyan

try {
    # Try to read the MongoDB URI from .env file
    if (Test-Path "backend/.env") {
        $envContent = Get-Content -Path "backend/.env" -Raw
        if ($envContent -match "MONGO_URI=(.+)") {
            $mongoUri = $matches[1]
            Write-Host "  Found MongoDB URI in .env: $($mongoUri.Substring(0, 20))..." -ForegroundColor Green
        } else {
            Write-Host "  MongoDB URI not found in .env file" -ForegroundColor Red
        }
    } else {
        Write-Host "  .env file not found in backend directory" -ForegroundColor Red
    }
} catch {
    Write-Host "  Error checking MongoDB connection: $_" -ForegroundColor Red
}

# Check if backend server is running
Write-Host "`n2. Checking Backend Server..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  Backend server is running on http://localhost:5000" -ForegroundColor Green
        Write-Host "  Health check response: $($response.Content)" -ForegroundColor Green
    } else {
        Write-Host "  Backend server returned status code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Backend server is not running or not accessible" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    
    # Check if any process is using port 5000
    $portCheck = netstat -ano | Select-String "5000"
    if ($portCheck) {
        Write-Host "  Port 5000 is in use by:" -ForegroundColor Yellow
        $portCheck
    } else {
        Write-Host "  Port 5000 is not in use by any process" -ForegroundColor Yellow
    }
}

# Check frontend angular server
Write-Host "`n3. Checking Frontend Server..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  Frontend Angular server is running on http://localhost:4200" -ForegroundColor Green
    } else {
        Write-Host "  Frontend server returned status code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Frontend server is not running or not accessible" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    
    # Check if any process is using port 4200
    $portCheck = netstat -ano | Select-String "4200"
    if ($portCheck) {
        Write-Host "  Port 4200 is in use by:" -ForegroundColor Yellow
        $portCheck
    } else {
        Write-Host "  Port 4200 is not in use by any process" -ForegroundColor Yellow
    }
}

# Check Angular environment configuration
Write-Host "`n4. Checking Angular Environment Configuration..." -ForegroundColor Cyan

try {
    if (Test-Path "frontend/src/environments/environment.ts") {
        $envContent = Get-Content -Path "frontend/src/environments/environment.ts" -Raw
        if ($envContent -match "apiUrl: '([^']+)'") {
            $apiUrl = $matches[1]
            Write-Host "  Frontend is configured to connect to: $apiUrl" -ForegroundColor Green
            
            # Check if apiUrl matches backend
            if ($apiUrl -eq "http://localhost:5000") {
                Write-Host "  Configuration looks correct" -ForegroundColor Green
            } else {
                Write-Host "  Warning: apiUrl in environment.ts doesn't match expected backend URL (http://localhost:5000)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Could not find apiUrl in environment.ts" -ForegroundColor Red
        }
    } else {
        Write-Host "  Angular environment.ts file not found" -ForegroundColor Red
    }
} catch {
    Write-Host "  Error checking Angular environment: $_" -ForegroundColor Red
}

Write-Host "`nHealth check complete!" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host "Recommendations:" -ForegroundColor Yellow
Write-Host "1. If backend is not running, run 'setup_and_start_backend.ps1'" -ForegroundColor Yellow
Write-Host "2. If frontend is not running, navigate to frontend directory and run 'npm start'" -ForegroundColor Yellow
Write-Host "3. Make sure your MongoDB Atlas connection is working (check .env file)" -ForegroundColor Yellow 