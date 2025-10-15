# Frontend Role Management - Next.js Implementation

## Overview

The Next.js frontend now properly hides role management UI from non-admin users and provides a secure admin panel for managing user roles.

## Changes Made

### 1. Profile Edit Page - Role Field Hidden

**File**: `app/profile/edit/page.tsx`

**Lines 402-417**: Changed role dropdown to read-only text input

**Before** ❌:
```tsx
<select
  id="role"
  value={role}
  onChange={(e) => setRole(e.target.value)}
>
  <option value="user">User</option>
  <option value="editor">Editor</option>
  <option value="moderator">Moderator</option>
  <option value="admin">Admin</option>
</select>
```

**After** ✅:
```tsx
<input
  type="text"
  id="role"
  value={role}
  disabled
  className="... bg-gray-100 text-gray-600 cursor-not-allowed capitalize"
/>
<p className="mt-1 text-xs text-gray-500">
  Your role cannot be changed. Contact an administrator if you need role changes.
</p>
```

**Line 83**: Removed role from API update call
```tsx
// role: role, // REMOVED: Users cannot change their own role
```

### 2. Role Utility Functions Created

**File**: `lib/roles.ts` (NEW)

Utility functions for checking user roles:

```typescript
// Check if user is admin
isAdmin(user): boolean

// Check if user is moderator or higher
isModerator(user): boolean

// Check if user is editor or higher
isEditor(user): boolean

// Check specific role
hasRole(user, role): boolean

// Check multiple roles
hasAnyRole(user, roles): boolean

// Get role display name
getRoleDisplayName(role): string

// Get role badge color for UI
getRoleBadgeColor(role): string

// Get all available roles
getAllRoles(): Role[]
```

### 3. Header Component - Admin Link Added

**File**: `components/Header.tsx`

**Desktop Menu** (Lines 71-87):
```tsx
{isAdmin(user) && (
  <>
    <hr className="my-1" />
    <Link href="/admin/users" className="...">
      <span className="flex items-center gap-2">
        <svg>...</svg>
        Manage Users
      </span>
    </Link>
  </>
)}
```

**Mobile Menu** (Lines 178-184):
```tsx
{isAdmin(user) && (
  <li>
    <Link href="/admin/users" className="...">
      🔐 Manage Users (Admin)
    </Link>
  </li>
)}
```

### 4. Admin API Functions Added

**File**: `lib/api.ts`

**New admin namespace** (Lines 697-726):

```typescript
export const admin = {
  // Get all users with roles (admin only)
  getAllUsers: async (params?) => {...},

  // Update user role (admin only)
  updateUserRole: async (userId, role) => {...},

  // Bulk update user roles (admin only)
  bulkUpdateRoles: async (users) => {...},
};
```

### 5. Admin User Management Page Created

**File**: `app/admin/users/page.tsx` (NEW)

Features:
- ✅ Admin-only access (redirects non-admins)
- ✅ List all users with pagination
- ✅ Search users by name, username, or email
- ✅ Filter users by role
- ✅ Change user roles inline
- ✅ Prevents changing own role
- ✅ Real-time UI updates
- ✅ Success/error messages
- ✅ Responsive design

## User Interface

### For Regular Users

1. **Profile Edit Page**:
   - Role field is **read-only** (grayed out)
   - Shows message: "Your role cannot be changed. Contact an administrator"
   - Role is **not sent** to API when updating profile

2. **Navigation**:
   - No admin menu items visible
   - Cannot access `/admin/users` (will be redirected)

### For Admin Users

1. **Profile Edit Page**:
   - Same as regular users (can't change own role for security)

2. **Navigation**:
   - "Manage Users" link appears in dropdown menu
   - Shows admin icon and purple color

3. **Admin Panel** (`/admin/users`):
   - Full user list with search and filters
   - Can change any user's role except their own
   - Real-time updates
   - Clear security messages

## Security Features

### Frontend Protection

✅ **UI Hiding**: Role edit controls hidden from non-admins
✅ **Route Protection**: Admin routes redirect non-admins
✅ **API Calls**: Role field removed from profile update
✅ **Self-Protection**: Admins can't change their own role

### Backend Protection (Laravel)

✅ **Middleware**: AdminMiddleware protects all admin routes
✅ **Validation**: Only valid roles accepted
✅ **Self-Demotion Prevention**: Server blocks own role changes
✅ **Token Verification**: All requests require valid auth token

## How to Test

### 1. As Regular User

```bash
# Login as regular user
# Navigate to /profile/edit
# Observe: Role field is disabled/grayed out
# Try to access /admin/users
# Result: Redirected to home page ✓
```

### 2. As Admin User

```bash
# Login as admin user
# Observe: "Manage Users" link in profile dropdown
# Click "Manage Users"
# Result: Admin panel opens ✓
# Try to change your own role
# Result: Grayed out with "(You)" label ✓
# Change another user's role
# Result: Role updates successfully ✓
```

## File Structure

```
nextjs-frontend/
├── lib/
│   ├── roles.ts                    # NEW: Role utility functions
│   └── api.ts                      # MODIFIED: Added admin namespace
├── components/
│   └── Header.tsx                  # MODIFIED: Added admin link
├── app/
│   ├── profile/
│   │   └── edit/
│   │       └── page.tsx            # MODIFIED: Role field disabled
│   └── admin/
│       └── users/
│           └── page.tsx            # NEW: Admin user management
└── FRONTEND_ROLE_MANAGEMENT.md     # This file
```

## API Integration

### Get All Users (Admin Only)

```typescript
const response = await admin.getAllUsers({
  page: 1,
  per_page: 15,
  role: 'admin',        // Optional filter
  search: 'john',       // Optional search
});

// Response:
{
  data: User[],
  meta: {
    current_page: number,
    last_page: number,
    per_page: number,
    total: number
  }
}
```

### Update User Role (Admin Only)

```typescript
const response = await admin.updateUserRole(userId, 'moderator');

// Response:
{
  message: "User role updated successfully",
  user: {
    id: 5,
    username: "johndoe",
    email: "john@example.com",
    display_name: "John Doe",
    old_role: "user",
    new_role: "moderator"
  }
}
```

## Code Examples

### Check if User is Admin

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

function MyComponent() {
  const { user } = useAuth();

  return (
    <>
      {isAdmin(user) && (
        <button>Admin Only Button</button>
      )}
    </>
  );
}
```

### Protect a Route

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin(user))) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAdmin(user)) {
    return <div>Loading...</div>;
  }

  return <div>Admin Content</div>;
}
```

### Show Role Badge

```typescript
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/roles';

function UserCard({ user }) {
  return (
    <div>
      <span className={`px-3 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
        {getRoleDisplayName(user.role)}
      </span>
    </div>
  );
}
```

## Troubleshooting

### Issue: Admin menu not showing

**Cause**: User role not loaded in context

**Solution**:
1. Check if `user.role` is set in AuthContext
2. Verify LoginResponse includes `role` field
3. Check browser console for errors

### Issue: Redirected from admin page

**Cause**: Not an admin or not authenticated

**Solution**:
1. Verify user is logged in
2. Check user role in database: `SELECT role FROM wp_users WHERE id = X`
3. Clear browser cache and cookies
4. Re-login

### Issue: Role change not working

**Cause**: Backend API error

**Solution**:
1. Check browser Network tab for API errors
2. Verify admin token is valid
3. Check Laravel logs: `laravel-api/storage/logs/laravel.log`
4. Ensure backend admin middleware is working

## Testing Checklist

- [ ] Regular user cannot see role dropdown in edit profile
- [ ] Regular user cannot access `/admin/users` page
- [ ] Regular user's role is not sent in profile update API call
- [ ] Admin user can see "Manage Users" link in navigation
- [ ] Admin user can access `/admin/users` page
- [ ] Admin user can view all users in admin panel
- [ ] Admin user can filter and search users
- [ ] Admin user can change other users' roles
- [ ] Admin user cannot change their own role
- [ ] Role changes reflect immediately in UI
- [ ] Success/error messages display correctly

## Next Steps

### Optional Enhancements

1. **Bulk Role Updates**
   - Add checkboxes to select multiple users
   - Change multiple roles at once

2. **User Activity Log**
   - Show last login time
   - Show role change history

3. **Email Notifications**
   - Notify users when their role changes
   - Send email to admins on role changes

4. **Advanced Permissions**
   - Define specific permissions per role
   - Show permission matrix

5. **User Suspension**
   - Add ability to suspend/unsuspend users
   - Show suspended status

## Summary

✅ **Role field hidden** from profile edit for all users
✅ **Admin link** only visible to admin users
✅ **Admin panel** created with full user management
✅ **Role checks** implemented with utility functions
✅ **API integration** complete with backend
✅ **Security** enforced on both frontend and backend
✅ **UI/UX** polished with proper feedback messages

The frontend now properly restricts role management to admin users only, matching the security implementation on the backend.
