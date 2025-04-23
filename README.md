# Clothing Store Application

A web application for discovering and reviewing clothing stores with Angular frontend and Flask/Python backend.

## Requirements

### Backend

- Python 3.8+
- MongoDB
- Redis (optional, for JWT token management)

### Frontend

- Node.js 14+
- Angular CLI

## Setup Instructions

### Clone the Repository

```bash
git clone <repository-url>
cd clothing-store-app
```

### Backend Setup

```bash
cd clothing-store-backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
python run.py
```

The backend server will run on http://localhost:5000

### Frontend Setup

```bash
cd clothing-store-frontend

# Install dependencies
npm install

# Run development server
npm start
```

The frontend application will be available at http://localhost:4200

## Quick Start

### Windows

```powershell
# Run both frontend and backend
.\start.ps1
```

### macOS/Linux

```bash
# Make script executable (first time only)
chmod +x start.sh

# Run both frontend and backend
./start.sh
```

## Troubleshooting

### API Connection Issues

- Ensure MongoDB is running
- Verify that the backend server is running on port 5000
- Check CORS settings if you're experiencing cross-origin issues

### Database Issues

- MongoDB needs to be installed and running
- Default connection string is `mongodb://localhost:27017/clothing_store`

## Features

- Browse clothing stores
- Filter stores by location and type
- View store details and reviews
- Add new stores (requires login)
- Add reviews for stores (requires login)
- User authentication system

## License

[MIT License](LICENSE)

# Clothing Store Application Improvements

This document outlines the improvements made to address critical issues and enhance both frontend and backend components of the application.

## Critical Issues Addressed

### 1. Missing Review Model Implementation

- Created `app/models/review.py` with complete implementation of:
  - Getting store reviews with pagination
  - Adding new reviews
  - Editing existing reviews
  - Deleting reviews
  - Adding replies to reviews
  - Updating store average ratings

### 2. JWT Refresh Token Implementation

- Enhanced `auth.py` with token rotation for better security
- Implemented secure handling of refresh tokens in Redis
- Updated frontend auth service to handle token refresh and expiration

### 3. Responsive Design Improvements

- Added media queries to `store-detail.component.scss` for adapting to mobile screens
- Improved layout for mobile devices
- Fixed gallery, sidebar, and header components on smaller screens

## Frontend Enhancements

### Responsive Design

- Added breakpoints at 992px, 768px, and 576px
- Created responsive grid layout for store details
- Improved image gallery for mobile viewing
- Enhanced sidebar rendering on smaller screens

### Form Validation & Error Handling

To be implemented:

```
- Add client-side validation in forms using Angular validators
- Provide visual feedback for validation errors
- Create user-friendly error messages
- Add retry mechanisms for failed API calls
```

### Performance Optimization

To be implemented:

```
- Implement lazy loading for routes
- Add virtual scrolling for long lists
- Use trackBy in ngFor loops
```

### User Experience

To be implemented:

```
- Add loading indicators for all async operations
- Implement toast notifications for user actions
- Enhance accessibility with ARIA attributes
```

## Backend Improvements

### API Security

- Improved refresh token implementation with token rotation
- Implemented secure token storage in Redis

Additional security measures to implement:

```
- Enhance rate limiting
- Add input sanitization for all endpoints
```

### Database Optimization

To be implemented:

```
- Add indexes for frequently queried fields
- Implement pagination for all list endpoints
```

### Error Handling

To be implemented:

```
- Create consistent error response formats
- Add more detailed logging
```

### Testing

To be implemented:

```
- Increase test coverage
- Add integration tests
```

## Documentation & Code Quality

### Documentation

To be implemented:

```
- Add API documentation using Swagger UI
- Improve code comments
- Complete this README
```

### Code Quality

- Removed unused imports in frontend components
- Fixed authentication service implementation

Additional improvements to make:

```
- Follow consistent naming conventions
- Remove duplicate code
- Implement proper TypeScript interfaces
```

## Implementation Notes

1. The review model now properly handles:

   - Adding/editing/deleting reviews
   - Managing review replies
   - Updating store ratings based on reviews
   - Proper permission handling for reviews

2. The JWT authentication system now:

   - Generates refresh tokens during login
   - Implements token rotation for security
   - Automatically refreshes tokens before expiration
   - Handles token invalidation during logout

3. The responsive design now:
   - Adapts to screen sizes from desktop to mobile
   - Maintains usability on small screens
   - Properly displays all store information
   - Provides a better mobile user experience

## Next Steps

1. Implement remaining form validation and error handling features
2. Add performance optimizations
3. Enhance user experience with loading indicators and notifications
4. Complete API security with rate limiting and input sanitization
5. Optimize database operations
6. Improve error handling and logging
7. Add comprehensive tests
8. Complete documentation
