#!/bin/bash

# Script to set up Google OAuth environment variables

echo "Setting up Google OAuth environment variables..."

# Prompt for Google OAuth credentials
read -p "Enter your Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -p "Enter your Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
read -p "Enter your Google OAuth Redirect URI (default: http://localhost:5000/auth/google/callback): " GOOGLE_REDIRECT_URI
read -p "Enter your Frontend URL (default: http://localhost:4200): " FRONTEND_URL

# Set default values if not provided
if [ -z "$GOOGLE_REDIRECT_URI" ]; then
    GOOGLE_REDIRECT_URI="http://localhost:5000/auth/google/callback"
fi

if [ -z "$FRONTEND_URL" ]; then
    FRONTEND_URL="http://localhost:4200"
fi

# Save to .env file in backend directory
ENV_FILE="backend/.env"

# Create directory if it doesn't exist
mkdir -p backend

# Check if file exists and create it if it doesn't
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
fi

# Read existing content to preserve it
EXISTING_CONTENT=""
if [ -f "$ENV_FILE" ]; then
    EXISTING_CONTENT=$(cat "$ENV_FILE")
fi

# Filter out any existing Google OAuth variables
FILTERED_CONTENT=""
while IFS= read -r line; do
    if [[ ! "$line" =~ ^GOOGLE_CLIENT_ID= && ! "$line" =~ ^GOOGLE_CLIENT_SECRET= && ! "$line" =~ ^GOOGLE_REDIRECT_URI= && ! "$line" =~ ^FRONTEND_URL= ]]; then
        FILTERED_CONTENT+="$line"$'\n'
    fi
done <<< "$EXISTING_CONTENT"

# Append new variables
echo "$FILTERED_CONTENT" > "$ENV_FILE"
echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> "$ENV_FILE"
echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" >> "$ENV_FILE"
echo "GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI" >> "$ENV_FILE"
echo "FRONTEND_URL=$FRONTEND_URL" >> "$ENV_FILE"

echo "Google OAuth environment variables set in $ENV_FILE"
echo "You need to restart your backend server for these changes to take effect."

# Instructions for obtaining Google OAuth credentials
echo -e "\nDon't have Google OAuth credentials yet? Follow these steps:"
echo "1. Go to https://console.cloud.google.com/"
echo "2. Create a new project or select an existing one"
echo "3. Go to 'APIs & Services' > 'Credentials'"
echo "4. Click 'Create Credentials' > 'OAuth client ID'"
echo "5. Set up the OAuth consent screen if prompted"
echo "6. For Application type, select 'Web application'"
echo "7. Add the redirect URI: $GOOGLE_REDIRECT_URI"
echo "8. Click 'Create' and note your Client ID and Client Secret"

# Make the script executable
chmod +x setup_google_oauth.sh 