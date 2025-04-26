# PowerShell script to run the Flask backend server
# Usage: .\run_backend.ps1

# Change to the backend directory
Set-Location -Path (Join-Path $PSScriptRoot "clothing-store-backend")

# Activate virtual environment if it exists
$VenvPath = Join-Path $PSScriptRoot "venv"
$ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"

if (Test-Path $ActivateScript) {
    Write-Host "Activating virtual environment at $VenvPath"
    . $ActivateScript
} else {
    Write-Host "Virtual environment not found. Running with system Python."
}

# Start the Flask server
Write-Host "Starting Flask server..."
python -m flask run

# Keep the window open until the user presses a key
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 