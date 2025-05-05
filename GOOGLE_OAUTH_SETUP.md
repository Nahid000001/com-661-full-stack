# Google OAuth Setup Instructions

This guide will help you set up Google OAuth for the application, allowing users to login and register using their Google accounts.

## Prerequisites

1. A Google account
2. Access to the Google Cloud Console (https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a name for your project and click "Create"
5. Select your new project from the dropdown

## Step 2: Enable the Google OAuth API

1. Go to "APIs & Services" > "Library"
2. Search for "Google OAuth2 API" or "OAuth2" 
3. Click on "Google OAuth2 API"
4. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" as the user type (unless you're using a Google Workspace domain)
3. Click "Create"
4. Fill in the required fields:
   - App name: Your application name
   - User support email: Your email address
   - Developer contact information: Your email address
5. Click "Save and Continue"
6. Under "Scopes", add the following scopes:
   - `email`
   - `profile`
   - `openid`
7. Click "Save and Continue"
8. Add test users if you're using external user type (your email is sufficient for testing)
9. Click "Save and Continue" and then "Back to Dashboard"

## Step 4: Create OAuth Client ID

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name for your client ID
5. Under "Authorized JavaScript origins", add:
   - `http://localhost:4200`
6. Under "Authorized redirect URIs", add:
   - `http://localhost:5000/auth/google/callback`
7. Click "Create"
8. A popup will show your Client ID and Client Secret. Save these values.

## Step 5: Configure the Application

Run the setup script to configure your application with the Google OAuth credentials:

```
# For Windows
./setup_google_oauth.ps1

# For Linux/Mac
./setup_google_oauth.sh
```

Follow the prompts to enter your Client ID and Client Secret.

## Step 6: Restart the Application

Restart both the backend and frontend to apply the changes:

```
# Restart backend
cd backend
python run.py

# Restart frontend (in a separate terminal)
cd frontend
npm start
```

## Troubleshooting

### Common Issues

1. **405 Method Not Allowed**: Make sure the backend server is running and the Google OAuth endpoints are correctly implemented.

2. **Invalid Redirect URI**: Ensure the redirect URI in your Google Cloud Console matches exactly what's configured in your application.

3. **Error: redirect_uri_mismatch**: Double-check that the redirect URI in your Google OAuth configuration exactly matches the one in your application.

4. **Failed to initiate Google login**: Ensure your Client ID and Client Secret are correctly set in your environment variables.

### Checking Configuration

To verify your Google OAuth configuration is correctly set, check:

1. Environment variables are set correctly:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
   - `FRONTEND_URL`

2. The backend is properly configured to handle Google OAuth requests.

3. The frontend is correctly calling the Google OAuth endpoints. 