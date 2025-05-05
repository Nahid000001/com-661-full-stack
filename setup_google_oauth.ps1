# Script to set up Google OAuth environment variables

Write-Host "Setting up Google OAuth environment variables..."

# Prompt for Google OAuth credentials
$GOOGLE_CLIENT_ID = Read-Host "Enter your Google OAuth Client ID"
$GOOGLE_CLIENT_SECRET = Read-Host "Enter your Google OAuth Client Secret"
$GOOGLE_REDIRECT_URI = Read-Host "Enter your Google OAuth Redirect URI (default: http://localhost:5000/auth/google/callback)" 
$FRONTEND_URL = Read-Host "Enter your Frontend URL (default: http://localhost:4200)"

# Set default values if not provided
if ([string]::IsNullOrWhiteSpace($GOOGLE_REDIRECT_URI)) {
    $GOOGLE_REDIRECT_URI = "http://localhost:5000/auth/google/callback"
}

if ([string]::IsNullOrWhiteSpace($FRONTEND_URL)) {
    $FRONTEND_URL = "http://localhost:4200"
}

# Save to .env file in backend directory
$envFilePath = "backend/.env"

# Check if file exists and create it if it doesn't
if (-not (Test-Path $envFilePath)) {
    New-Item -Path $envFilePath -ItemType File | Out-Null
}

# Read existing content to preserve it
$existingContent = ""
if (Test-Path $envFilePath) {
    $existingContent = Get-Content $envFilePath
}

# Filter out any existing Google OAuth variables
$filteredContent = $existingContent | Where-Object { 
    -not ($_ -match "^GOOGLE_CLIENT_ID=") -and 
    -not ($_ -match "^GOOGLE_CLIENT_SECRET=") -and 
    -not ($_ -match "^GOOGLE_REDIRECT_URI=") -and
    -not ($_ -match "^FRONTEND_URL=")
}

# Append new variables
$newContent = $filteredContent
$newContent += "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
$newContent += "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
$newContent += "GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI"
$newContent += "FRONTEND_URL=$FRONTEND_URL"

# Write back to file
$newContent | Out-File -FilePath $envFilePath -Encoding utf8

Write-Host "Google OAuth environment variables set in $envFilePath"
Write-Host "You need to restart your backend server for these changes to take effect."

# Instructions for obtaining Google OAuth credentials
Write-Host "`nDon't have Google OAuth credentials yet? Follow these steps:"
Write-Host "1. Go to https://console.cloud.google.com/"
Write-Host "2. Create a new project or select an existing one"
Write-Host "3. Go to 'APIs & Services' > 'Credentials'"
Write-Host "4. Click 'Create Credentials' > 'OAuth client ID'"
Write-Host "5. Set up the OAuth consent screen if prompted"
Write-Host "6. For Application type, select 'Web application'"
Write-Host "7. Add the redirect URI: $GOOGLE_REDIRECT_URI"
Write-Host "8. Click 'Create' and note your Client ID and Client Secret" 