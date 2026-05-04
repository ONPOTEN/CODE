# Firebase Authentication with Nickname Field Implementation

## Summary

Successfully implemented Firebase authentication with nickname field support across both Next.js frontend and Laravel backend.

## Changes Made

### Frontend (Next.js)

#### 1. Registration Form Update
**File:** `app/register/page.tsx`

- Added `nickname` field to the registration form state
- Added nickname input field in the UI (between Full Name and Email)
- Updated `firebaseRegister()` call to pass nickname parameter

```typescript
const [formData, setFormData] = useState({
  displayName: '',
  nickname: '',  // NEW
  email: '',
  password: '',
  confirmPassword: '',
});
```

#### 2. Firebase Auth Service Update
**File:** `lib/firebaseAuthService.ts`

- Updated `registerWithEmail()` method signature to accept optional `nickname` parameter
- Added nickname to the JSON payload sent to Laravel backend
- Includes automatic fallback: if no nickname provided, uses `displayName.replace(/\s+/g, '_').toLowerCase()`

```typescript
registerWithEmail: async (
  email: string,
  password: string,
  displayName: string,
  nickname?: string,  // NEW
  username?: string
)
```

**Payload sent to backend:**
```json
{
  "firebase_uid": "...",
  "email": "user@example.com",
  "display_name": "John Doe",
  "nickname": "johndoe",  // NEW
  "username": "john_doe",
  "firebase_token": "..."
}
```

#### 3. Auth Context Update
**File:** `contexts/AuthContext.tsx`

- Updated `firebaseRegister()` method signature to accept optional `nickname` parameter
- Updated interface definition in `AuthContextType`

```typescript
firebaseRegister: (
  email: string,
  password: string,
  displayName: string,
  nickname?: string  // NEW
) => Promise<void>;
```

#### 4. Documentation Updates

**FIREBASE_NEXTJS_SETUP.md:**
- Updated Firebase Registration endpoint request/response examples to include nickname field
- Updated Laravel controller code to validate and store nickname

**FIREBASE_QUICK_REFERENCE.md:**
- Updated quick reference guide with nickname field in Laravel controller example

### Backend (Laravel)

#### 1. Firebase Methods in AuthController
**File:** `app/Http/Controllers/Api/AuthController.php`

Added two new methods:

**`firebaseRegister(Request $request)`**
- Validates Firebase registration data
- Creates new user with Firebase UID
- Stores nickname in `user_nicename` field
- Returns user data and API token

**Validation Rules:**
```php
[
  'firebase_uid' => 'required|string|unique:wp_users,firebase_uid',
  'email' => 'required|email|unique:wp_users,user_email',
  'display_name' => 'required|string',
  'nickname' => 'required|string|unique:wp_users,user_nicename',
  'username' => 'required|string|unique:wp_users,user_login',
]
```

**`firebaseLogin(Request $request)`**
- Handles Firebase login with multiple auth methods (email, google, facebook, apple, phone)
- Creates or updates user in database
- Supports first-time social login with auto-generated credentials
- Updates last login timestamp and auth method

**Supported auth methods:**
- `email`
- `google`
- `facebook`
- `apple`
- `phone`

#### 2. Routes Update
**File:** `routes/api.php`

Added two public routes:
```php
Route::post('/auth/firebase-register', [AuthController::class, 'firebaseRegister']);
Route::post('/auth/firebase-login', [AuthController::class, 'firebaseLogin']);
```

#### 3. WpUser Model Update
**File:** `app/Models/WpUser.php`

Updated `fillable` array to include Firebase fields:
```php
protected $fillable = [
    // ... existing fields ...
    'firebase_uid',
    'auth_method',
    'last_login_at',
    'email_verified_at',
];
```

#### 4. Database Migration
**File:** `database/migrations/2025_10_22_000001_add_firebase_fields_to_wp_users_table.php`

Created migration to add Firebase columns to `wp_users` table:
- `firebase_uid` (string, unique, nullable)
- `auth_method` (string, nullable)
- `last_login_at` (timestamp, nullable)
- `email_verified_at` (timestamp, nullable)

**Run migration:**
```bash
php artisan migrate
```

## Data Flow

### Registration Flow

1. User fills registration form with Full Name, Nickname, Email, and Password
2. Frontend validates form and calls `firebaseRegister(email, password, displayName, nickname)`
3. Firebase creates user account with email/password
4. Frontend sends POST to `/api/v1/auth/firebase-register` with user data
5. Laravel creates user record with Firebase UID and nickname
6. Backend returns user data and API token
7. Frontend stores token and redirects to home page

### Login Flow (Email)

1. User enters email and password
2. Frontend calls `firebaseLoginEmail(email, password)`
3. Firebase authenticates user
4. Frontend sends POST to `/api/v1/auth/firebase-login` with Firebase UID
5. Laravel finds existing user or creates new user (for social logins)
6. Backend returns user data and API token
7. Frontend stores token and redirects to home page

### Social Login Flow (Google/Facebook/Apple)

1. User clicks social provider button
2. Frontend calls appropriate method (e.g., `firebaseLoginGoogle()`)
3. Firebase handles OAuth flow and returns user profile
4. Frontend sends POST to `/api/v1/auth/firebase-login` with:
   - Firebase UID
   - Email
   - Display name
   - Auth method (google/facebook/apple)
5. Laravel finds existing user OR creates new user with auto-generated username
6. Backend returns user data and API token
7. Frontend stores token and redirects to home page

## Database Schema

The `wp_users` table now includes:

| Column | Type | Description |
|--------|------|-------------|
| firebase_uid | string | Unique Firebase user identifier |
| auth_method | string | Authentication method used (email, google, facebook, apple, phone) |
| last_login_at | timestamp | Timestamp of user's last login |
| email_verified_at | timestamp | Email verification timestamp (auto-set for Firebase) |

The `user_nicename` field is used to store the nickname.

## API Request/Response Examples

### Firebase Registration

**Request:**
```json
POST /api/v1/auth/firebase-register

{
  "firebase_uid": "abc123xyz",
  "email": "user@example.com",
  "display_name": "John Doe",
  "nickname": "johndoe",
  "username": "john_doe",
  "firebase_token": "firebase-id-token"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "user@example.com",
    "display_name": "John Doe"
  },
  "token": "laravel-api-token",
  "message": "Firebase registration successful"
}
```

### Firebase Login

**Request:**
```json
POST /api/v1/auth/firebase-login

{
  "firebase_uid": "abc123xyz",
  "email": "user@example.com",
  "display_name": "John Doe",
  "auth_method": "google"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "user@example.com",
    "display_name": "John Doe"
  },
  "token": "laravel-api-token",
  "message": "Firebase login successful"
}
```

## Next Steps

1. **Start Laravel database server** - Ensure MySQL is running
2. **Run migration** - Execute `php artisan migrate` to create Firebase columns
3. **Set up Firebase project** - Configure Firebase SDK with project credentials
4. **Configure social providers** - Set up Google OAuth, Facebook App, Apple Sign-In credentials
5. **Test registration flow** - Test nickname field acceptance and uniqueness
6. **Test social logins** - Verify all authentication methods work
7. **Verify nickname field** - Confirm nickname is properly stored in database

## Files Modified/Created

**Frontend:**
- ✅ `app/register/page.tsx` - Added nickname field
- ✅ `lib/firebaseAuthService.ts` - Updated registerWithEmail() method
- ✅ `contexts/AuthContext.tsx` - Updated firebaseRegister() method
- ✅ `FIREBASE_NEXTJS_SETUP.md` - Updated documentation
- ✅ `FIREBASE_QUICK_REFERENCE.md` - Updated quick reference
- ✅ `FIREBASE_NICKNAME_IMPLEMENTATION.md` - This file

**Backend:**
- ✅ `app/Http/Controllers/Api/AuthController.php` - Added firebaseRegister() and firebaseLogin()
- ✅ `routes/api.php` - Added Firebase routes
- ✅ `app/Models/WpUser.php` - Updated fillable array
- ✅ `database/migrations/2025_10_22_000001_add_firebase_fields_to_wp_users_table.php` - Created migration

## Summary of Changes

### Nickname Field Implementation
- **Frontend:** Added nickname input field to registration form
- **Service Layer:** Firebase auth service accepts and sends nickname to backend
- **Context:** Auth context passes nickname through to service layer
- **Backend:** Validates nickname uniqueness and stores in user_nicename column
- **Database:** Already uses user_nicename for nickname storage

### Firebase Integration
- **Backend Routes:** Added `/auth/firebase-register` and `/auth/firebase-login` endpoints
- **Controller Methods:** Implemented both Firebase registration and login flows
- **Database Support:** Added firebase_uid, auth_method, last_login_at, email_verified_at columns
- **Model:** Updated WpUser model to support all new fields

## Error Handling

The implementation includes comprehensive error handling:

- **Validation errors:** Firebase UID, email, nickname, and username uniqueness constraints
- **Database errors:** Caught and returned as JSON responses
- **Firebase errors:** Converted to user-friendly messages by getErrorMessage() utility
- **Token management:** Proper token creation, storage, and cleanup

## Security Considerations

1. **Firebase UID is unique** - Prevents duplicate accounts from same Firebase user
2. **Email is unique** - Ensures one email per account
3. **Nickname is unique** - Allows mention features like @username
4. **Random passwords** - Firebase users get random passwords since Firebase handles auth
5. **Token-based auth** - Uses Laravel Sanctum for API authentication
6. **Email pre-verified** - Firebase users are automatically verified
7. **Auth method tracking** - Records which method was used for login (audit trail)
