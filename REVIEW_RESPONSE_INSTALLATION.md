# Review Response Feature: Installation & Usage Guide

This document provides instructions for deploying and using the new review response feature, which allows store owners and administrators to respond to customer reviews.

## Overview

The review response feature enables:

- Store owners to respond to reviews on their own store's products
- Admin users to respond to any review across the platform
- Timestamped responses clearly marked as coming from the store owner or admin
- Notifications to users when their reviews receive responses
- Ability to edit or delete responses
- Improved UI to make it obvious to shoppers when reviews have received responses

## Deployment Steps

### 1. Update Database

Run the database migration scripts to prepare MongoDB for the new features:

```bash
# Create notifications collection and indexes
python backend/app/scripts/create_notifications_collection.py

# Update existing review replies with unique IDs
python backend/app/scripts/add_reply_ids.py
```

### 2. Update Backend Code

The following files have been modified or created:

- `backend/app/models/review.py`: Enhanced to support editing and deleting replies
- `backend/app/routes/reviews.py`: Added new endpoints for reply management and notifications
- Backend scripts for migration

### 3. Update Frontend Code

The following frontend components have been modified or created:

- `frontend/src/app/models/review.model.ts`: Updated review model
- `frontend/src/app/services/review.service.ts`: Added new API methods
- `frontend/src/app/components/review-list/review-list.component.*`: Enhanced review display and response handling
- `frontend/src/app/components/profile/review-notifications.component.ts`: New component for showing review responses to users
- `frontend/src/app/app.routes.ts`: Added new route for notifications
- `frontend/src/app/components/navigation/navigation.component.html`: Added menu item for notifications

### 4. Restart Application

After deploying the changes, restart your application:

```bash
# For Windows
./start.ps1

# For Linux/macOS
./start.sh
```

## Usage Guide

### Responding to Reviews (Store Owners & Admins)

1. Log in as a store owner or admin
2. Navigate to your store's page
3. In the reviews section, find the review you want to respond to
4. Click the "Reply" button beneath the review
5. Write your response and click "Submit Reply"

### Editing or Deleting Responses

1. Find the review with your response
2. You'll see "Edit" and "Delete" buttons next to your response
3. To edit: Click "Edit", modify your text, and save
4. To delete: Click "Delete" and confirm

### Viewing Responses to Your Reviews (Customers)

1. Log in to your account
2. Click on your profile dropdown in the top right
3. Select "Review Responses"
4. View all the responses to your reviews in one place

## Monitoring & Troubleshooting

- Check MongoDB logs for any errors related to the notifications or reviews collections
- Monitor the application logs for API errors when handling review responses
- Use browser developer tools to identify any frontend issues
- Note: If you see SASS deprecation warnings about @import, these have been addressed by using @use instead

## Benefits & Business Impact

- Improves customer satisfaction by allowing direct responses to feedback
- Enhances store owner engagement with their customers
- Provides visibility into review management for administrators
- Creates a more interactive shopping experience for all users
- Keeps customers informed when their reviews receive attention 