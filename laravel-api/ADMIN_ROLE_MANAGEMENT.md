# Admin Role Management Guide

## Overview

Only users with the **admin** role can change user roles. Regular users cannot change their own or other users' roles.

## Security Features

✅ **Role field removed** from user profile update endpoint
✅ **Admin middleware** protects role management endpoints
✅ **Self-demotion prevention** - Admins cannot change their own role
✅ **Validation** - Only valid roles can be assigned
✅ **Audit trail** - Old and new roles are logged in responses

## Available Roles

- `user` - Regular user (default)
- `editor` - Can edit content
- `moderator` - Can moderate content
- `admin` - Full system access, can manage user roles

## API Endpoints

### 1. Update Single User Role (Admin Only)

**Endpoint**: `PUT /api/v1/admin/users/{userId}/role`

**Authentication**: Required (Bearer token)

**Authorization**: Admin role required

**Request Body**:
```json
{
  "role": "moderator"
}
```

**Success Response** (200):
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": 5,
    "username": "johndoe",
    "email": "john@example.com",
    "display_name": "John Doe",
    "old_role": "user",
    "new_role": "moderator"
  }
}
```

**Error Responses**:

- **401 Unauthorized** - Not authenticated
  ```json
  {
    "message": "Unauthenticated."
  }
  ```

- **403 Forbidden** - Not an admin
  ```json
  {
    "message": "Unauthorized. Admin access required."
  }
  ```

- **403 Forbidden** - Trying to change own role
  ```json
  {
    "message": "You cannot change your own role",
    "errors": {
      "role": ["You cannot change your own role"]
    }
  }
  ```

- **404 Not Found** - User doesn't exist
  ```json
  {
    "message": "No query results for model [App\\Models\\WpUser] {userId}"
  }
  ```

- **422 Validation Error** - Invalid role
  ```json
  {
    "message": "The selected role is invalid.",
    "errors": {
      "role": ["The selected role is invalid."]
    }
  }
  ```

### 2. Get All Users with Roles (Admin Only)

**Endpoint**: `GET /api/v1/admin/users`

**Authentication**: Required (Bearer token)

**Authorization**: Admin role required

**Query Parameters**:
- `role` (optional) - Filter by specific role (user, admin, moderator, editor)
- `search` (optional) - Search by username, email, or display name
- `per_page` (optional) - Items per page (default: 15, max: 100)
- `page` (optional) - Page number

**Examples**:
```
GET /api/v1/admin/users
GET /api/v1/admin/users?role=admin
GET /api/v1/admin/users?search=john
GET /api/v1/admin/users?per_page=25&page=2
```

**Success Response** (200):
```json
{
  "data": [
    {
      "ID": 1,
      "user_login": "admin",
      "user_email": "admin@example.com",
      "display_name": "Admin User",
      "role": "admin",
      "user_registered": "2025-01-01T00:00:00.000000Z"
    },
    {
      "ID": 2,
      "user_login": "johndoe",
      "user_email": "john@example.com",
      "display_name": "John Doe",
      "role": "moderator",
      "user_registered": "2025-01-02T00:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 42
  }
}
```

### 3. Bulk Update User Roles (Admin Only)

**Endpoint**: `POST /api/v1/admin/users/roles/bulk-update`

**Authentication**: Required (Bearer token)

**Authorization**: Admin role required

**Request Body**:
```json
{
  "users": [
    {
      "user_id": 5,
      "role": "moderator"
    },
    {
      "user_id": 6,
      "role": "editor"
    },
    {
      "user_id": 7,
      "role": "user"
    }
  ]
}
```

**Success Response** (200):
```json
{
  "message": "3 user(s) updated successfully",
  "updated_users": [
    {
      "user_id": 5,
      "username": "johndoe",
      "old_role": "user",
      "new_role": "moderator"
    },
    {
      "user_id": 6,
      "username": "janedoe",
      "old_role": "user",
      "new_role": "editor"
    },
    {
      "user_id": 7,
      "username": "bobsmith",
      "old_role": "editor",
      "new_role": "user"
    }
  ],
  "errors": []
}
```

**Response with Errors**:
```json
{
  "message": "2 user(s) updated successfully",
  "updated_users": [...],
  "errors": [
    {
      "user_id": 1,
      "message": "Cannot change your own role"
    }
  ]
}
```

## Security Implementation

### 1. Protected Profile Update

**File**: `app/Http/Controllers/Api/UserController.php`

The `updateProfile()` method **no longer accepts** the `role` field:

```php
// OLD (INSECURE):
$validated = $request->validate([
    'role' => 'sometimes|nullable|string|in:user,admin,moderator,editor', // ❌ BAD
]);

// NEW (SECURE):
$validated = $request->validate([
    // 'role' removed - Users cannot change their own role ✅
]);
```

### 2. Admin Middleware

**File**: `app/Http/Middleware/AdminMiddleware.php`

Protects admin-only routes:

```php
public function handle(Request $request, Closure $next): Response
{
    $user = $request->user();

    if (!$user || $user->role !== 'admin') {
        return response()->json([
            'message' => 'Unauthorized. Admin access required.',
        ], 403);
    }

    return $next($request);
}
```

### 3. Self-Demotion Prevention

Admins cannot change their own role to prevent accidental lockout:

```php
if ($request->user()->ID === $targetUser->ID) {
    return response()->json([
        'message' => 'You cannot change your own role',
    ], 403);
}
```

## Using the API

### Example: Update User Role with cURL

```bash
# Update single user role
curl -X PUT http://localhost:8000/api/v1/admin/users/5/role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "moderator"}'
```

### Example: Get All Users

```bash
# Get all users
curl -X GET http://localhost:8000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get all admin users
curl -X GET "http://localhost:8000/api/v1/admin/users?role=admin" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Example: Bulk Update

```bash
curl -X POST http://localhost:8000/api/v1/admin/users/roles/bulk-update \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {"user_id": 5, "role": "moderator"},
      {"user_id": 6, "role": "editor"}
    ]
  }'
```

### Example: Using JavaScript/Fetch

```javascript
// Update user role
async function updateUserRole(userId, newRole, adminToken) {
  const response = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ role: newRole })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('Role updated:', data);
  } else {
    console.error('Error:', data);
  }
}

// Usage
updateUserRole(5, 'moderator', 'your-admin-token-here');
```

### Example: Using PHP/Laravel HTTP Client

```php
use Illuminate\Support\Facades\Http;

// Update user role
$response = Http::withToken($adminToken)
    ->put('http://localhost:8000/api/v1/admin/users/5/role', [
        'role' => 'moderator'
    ]);

if ($response->successful()) {
    $data = $response->json();
    echo "Role updated: " . $data['user']['new_role'];
} else {
    echo "Error: " . $response->json()['message'];
}
```

## User Model Helper Methods

The `WpUser` model now includes helpful role-checking methods:

```php
// Check if user is admin
if ($user->isAdmin()) {
    // Admin-only code
}

// Check if user is moderator or higher
if ($user->isModerator()) {
    // Moderator/Admin code
}

// Check if user is editor or higher
if ($user->isEditor()) {
    // Editor/Moderator/Admin code
}

// Check specific role
if ($user->hasRole('admin')) {
    // Admin code
}

// Check multiple roles
if ($user->hasAnyRole(['admin', 'moderator'])) {
    // Admin or Moderator code
}
```

## Testing the Implementation

### 1. Create Admin User

First, manually set a user as admin in the database:

```sql
UPDATE wp_users SET role = 'admin' WHERE user_login = 'your-username';
```

Or create a new admin via tinker:

```bash
php artisan tinker
```

```php
$user = \App\Models\WpUser::find(1);
$user->role = 'admin';
$user->save();
```

### 2. Login as Admin

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }'
```

Save the token from the response.

### 3. Test Role Update

```bash
# Should succeed (as admin)
curl -X PUT http://localhost:8000/api/v1/admin/users/5/role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "moderator"}'
```

### 4. Test as Regular User

Login as a regular user and try to change a role:

```bash
# Should fail with 403 Forbidden
curl -X PUT http://localhost:8000/api/v1/admin/users/5/role \
  -H "Authorization: Bearer REGULAR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### 5. Test Self-Demotion Prevention

Try to change your own role:

```bash
# Should fail with "You cannot change your own role"
curl -X PUT http://localhost:8000/api/v1/admin/users/1/role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "user"}'
```

## Middleware Registration

Ensure the admin middleware is registered in `bootstrap/app.php` or `app/Http/Kernel.php`:

```php
// In bootstrap/app.php (Laravel 11+)
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'admin' => \App\Http\Middleware\AdminMiddleware::class,
    ]);
})

// OR in app/Http/Kernel.php (Laravel 10 and earlier)
protected $middlewareAliases = [
    'admin' => \App\Http\Middleware\AdminMiddleware::class,
];
```

## Best Practices

### 1. Always Use Admin Middleware

```php
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    // Admin-only routes
});
```

### 2. Log Role Changes

Consider adding logging to track who changed roles:

```php
use Illuminate\Support\Facades\Log;

Log::info('User role updated', [
    'admin_id' => $request->user()->ID,
    'target_user_id' => $targetUser->ID,
    'old_role' => $oldRole,
    'new_role' => $targetUser->role,
]);
```

### 3. Validate in Multiple Layers

- ✅ Middleware (route protection)
- ✅ Controller validation
- ✅ Business logic checks

### 4. Use Role Helper Methods

Instead of:
```php
if ($user->role === 'admin') { }
```

Use:
```php
if ($user->isAdmin()) { }
```

## Troubleshooting

### Issue: "Unauthorized. Admin access required"

**Cause**: User is not an admin or not authenticated

**Solution**:
1. Check if user is logged in
2. Verify user has `role = 'admin'` in database
3. Ensure token is valid and not expired

### Issue: "You cannot change your own role"

**Cause**: Admin trying to change their own role

**Solution**: Have another admin change your role, or update directly in database

### Issue: Route not found

**Cause**: Middleware not registered or routes not loaded

**Solution**:
1. Clear route cache: `php artisan route:clear`
2. Check middleware registration
3. Verify routes with: `php artisan route:list`

## Summary

✅ Regular users **cannot** change any roles (including their own)
✅ Only **admin** users can change user roles
✅ Admins **cannot** change their own role (prevents accidental lockout)
✅ All role changes are validated and protected by middleware
✅ Comprehensive API endpoints for single and bulk role updates

This ensures a secure, admin-only role management system for your Laravel application.
