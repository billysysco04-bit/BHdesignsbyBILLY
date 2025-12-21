# MenuMaker by BHdesignsbyBILLY - Admin Guide

## Admin Access

### Creating an Admin Account

To create an admin account, you need to use the **admin secret** during registration.

**Admin Secret:** `admin-secret-2025`

### Registration Steps:

1. Go to the registration page (Sign Up)
2. Fill in your details:
   - Name
   - Email
   - Password
   - **Admin Secret:** `admin-secret-2025` (use this exact value in the registration payload)

### Pre-configured Admin Account

An admin account has already been created for you:

**Email:** admin@menumaker.com  
**Password:** admin123  
**Admin Secret Used:** admin-secret-2025

### Accessing Admin Panel

1. Log in with admin credentials
2. Once logged in, you'll see an "Admin Panel" button in the dashboard header
3. Click on "Admin Panel" to access administrative features

## Admin Features

### Dashboard Statistics
- **Total Users** - View total registered users
- **Total Menus** - View total menus created
- **Admin Users** - Count of admin accounts
- **Average Menus per User** - Calculated metric

### User Management
- View all registered users
- See user roles (Admin/User)
- Delete non-admin users
- View join dates

### Menu Management
- View all menus across all users
- See menu owners
- Delete any menu
- View menu details (title, items count, creation date)

### Tabs Available
1. **Overview** - Statistics dashboard
2. **All Users** - Complete user list with management options
3. **All Menus** - Complete menu list with management options

## API Endpoints (Admin Only)

All admin endpoints require authentication with an admin account:

```
GET  /api/admin/stats       - Get platform statistics
GET  /api/admin/users       - Get all users
GET  /api/admin/menus       - Get all menus
DELETE /api/admin/users/{user_id}  - Delete user and their menus
DELETE /api/admin/menus/{menu_id}  - Delete any menu
```

## Security Notes

1. **Admin Secret** is stored in backend environment variable `ADMIN_SECRET`
2. Current secret: `admin-secret-2025` (can be changed in `/app/backend/.env`)
3. Only users who register with the correct admin secret get admin privileges
4. Admin status cannot be revoked once granted
5. Admins cannot delete other admin accounts

## Environment Variables

Backend `.env` file contains:
```
ADMIN_SECRET=admin-secret-2025
```

To change the admin secret, update this value in `/app/backend/.env` and restart the backend service.

## Branding

Application is branded as:
- **Primary Name:** MenuMaker
- **Tagline:** by BHdesignsbyBILLY

This branding appears on:
- Landing page
- Authentication pages
- Dashboard header
- All navigation elements
- Footer
