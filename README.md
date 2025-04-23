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

## Features

- Browse clothing stores
- Filter stores by location and type
- View store details and reviews
- Add new stores (requires login)
- Add reviews for stores (requires login)
- User authentication system
- Admin management interface

## Recent Improvements

### Backend Enhancements

- **Standardized Error Handling**: Implemented consistent error handling using custom exception types across all API endpoints.
- **Database Optimization**: Added comprehensive MongoDB indexes for stores, users, and reviews collections to improve query performance.
- **API Documentation**: Added Swagger API documentation to all major endpoints for easier API integration.
- **Security Improvements**: Enhanced JWT token handling with proper Redis integration for token invalidation.
- **Data Validation**: Improved validation for all API inputs with clear error messages.

### Frontend Enhancements

- **Lazy Loading**: Implemented lazy loading for all major routes to improve initial load time and performance.
- **Form Validation**: Added comprehensive form validation with detailed error messages.
- **Error Handling**: Improved error handling in services with clear user feedback.
- **Removed Fallback Data**: Eliminated dummy/fallback data from services to ensure real API interactions.
- **UI Improvements**: Enhanced modal components and form controls for better user experience.

### Testing and Documentation

- **API Tests**: Extended test coverage for API endpoints.
- **Documentation**: Updated documentation with detailed setup instructions and feature documentation.

## Architecture

### Backend (Flask/MongoDB)

The backend follows a structured architecture:

- **Routes**: API endpoints for stores, reviews, authentication, and admin operations
- **Models**: Data models for stores, users, and reviews
- **Utils**: Utility functions for error handling, validation, and helpers
- **Middleware**: Authentication and request processing middleware
- **Config**: Application configuration management

### Frontend (Angular)

The frontend follows Angular best practices:

- **Components**: Modular components for different views and features
- **Services**: API service layer for backend communication
- **Guards**: Route guards for authentication and authorization
- **Interceptors**: HTTP interceptors for authentication token management
- **Models/Interfaces**: TypeScript interfaces for type safety

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
