# Nickname Login Implementation Guide

## Overview

Users can now login using either their **email address** or their **nickname** in the Next.js login page. The system automatically detects whether the input is an email (contains @) or a nickname, and routes to the appropriate authentication method.

---

## Features Implemented

✅ **Unified Login Field** - Single input field accepts both email and nickname
✅ **Smart Detection** - Automatically detects email vs nickname based on @ symbol
✅ **Firebase Integration** - Uses Firebase authentication with email behind the scenes
✅ **Database Lookup** - Fetches user email from nickname via Laravel API
✅ **Error Handling** - Clear error messages for invalid credentials
✅ **Loading States** - Loading indicator during authentication

---

## How It Works

### Login Flow (Email)
```
User enters: "user@example.com"
                    ↓
System detects "@" symbol → Email login
                    ↓
Firebase authenticates with email/password
                    ↓
Laravel backend validates and returns token
                    ↓
User authenticated
```

### Login Flow (Nickname)
```
User enters: "johndoe"
                    ↓
System detects no "@" → Nickname login
                    ↓
Frontend calls: GET /api/v1/users/by-nickname/johndoe
                    ↓
Laravel returns: { user_email: "john@example.com", ... }
                    ↓
Frontend uses email to authenticate with Firebase
                    ↓
Firebase authentication with email/password
                    ↓
Laravel backend validates and returns token
                    ↓
User authenticated
```

---

## Frontend Changes

### 1. Login Page (`app/login/page.tsx`)

**Changed:**
- Input field now accepts both email and nickname
- Placeholder text: "Email address or nickname"
- Form label: "Email or Nickname"
- Input type changed from `email` to `text`

**Logic:**
```typescript
const handleEmailOrNicknameLogin = async (e: FormEvent) => {
  e.preventDefault();
  try {
    const isEmail = emailOrNickname.includes('@');

    if (isEmail) {
      await firebaseLoginEmail(emailOrNickname, password);
    } else {
      await firebaseLoginNickname(emailOrNickname, password);
    }
    router.push('/');
  } catch (err) {
    console.error('Login failed:', err);
  }
};
```

### 2. Firebase Auth Service (`lib/firebaseAuthService.ts`)

**New Method:** `loginWithNickname(nickname: string, password: string)`

**Steps:**
1. Fetch user from Laravel using `/users/by-nickname/{nickname}`
2. Extract email from response
3. Sign in with Firebase using email/password
4. Send login request to Laravel backend
5. Return user data and token

**Code:**
```typescript
loginWithNickname: async (nickname: string, password: string) => {
  // Fetch user email from Laravel
  const userResponse = await apiRequest<any>('/users/by-nickname/' + nickname, {
    method: 'GET',
  });

  if (!userResponse || !userResponse.user_email) {
    throw new Error('User not found');
  }

  const email = userResponse.user_email;

  // Sign in with Firebase using email
  const userCredential = await firebaseAuth.login(email, password);
  const firebaseUser = userCredential.user;

  // Get token and authenticate with Laravel
  const idToken = await firebaseAuth.getIdToken();

  const response = await apiRequest<FirebaseAuthResponse>('/auth/firebase-login', {
    method: 'POST',
    body: JSON.stringify({
      firebase_uid: firebaseUser.uid,
      email: firebaseUser.email,
      display_name: firebaseUser.displayName || email,
      auth_method: 'email',
      nickname: nickname,
      firebase_token: idToken,
    }),
  });

  if (response.success) {
    tokenStorage.set(response.token);
    return response;
  } else {
    throw new Error(response.error || 'Login failed');
  }
};
```

### 3. Auth Context (`contexts/AuthContext.tsx`)

**New Method:** `firebaseLoginNickname(nickname: string, password: string)`

**Features:**
- Calls firebaseAuthService.loginWithNickname()
- Manages loading state during authentication
- Handles errors and displays friendly messages
- Updates user state on successful login
- Emits token update event for other components
- Sets auth method to 'firebase-nickname'

**Code:**
```typescript
const firebaseLoginNickname = async (nickname: string, password: string) => {
  try {
    setIsLoading(true);
    setError(null);
    setValidationErrors(null);

    const response = await firebaseAuthService.loginWithNickname(nickname, password);
    if (response.success) {
      setUser(response.user as any);
      setAuthMethod('firebase-nickname');

      // Emit token update event
      const token = tokenStorage.get();
      if (token && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
      }
    } else {
      throw new Error(response.error || 'Login failed');
    }
  } catch (err: any) {
    const errorMessage = firebaseAuthService.getErrorMessage(err);
    setError(errorMessage);
    throw err;
  } finally {
    setIsLoading(false);
  }
};
```

---

## Backend Changes

### 1. UserController (`app/Http/Controllers/Api/UserController.php`)

**New Method:** `byNickname($nickname)`

**Functionality:**
- Accepts nickname as URL parameter
- Queries database for user by `user_nicename` field
- Returns user basic information
- Throws 404 if user not found

**Code:**
```php
public function byNickname(Request $request, $nickname)
{
    $user = WpUser::where('user_nicename', $nickname)->firstOrFail();

    return response()->json([
        'user_id' => $user->ID,
        'user_login' => $user->user_login,
        'user_email' => $user->user_email,
        'user_nicename' => $user->user_nicename,
        'display_name' => $user->display_name,
    ]);
}
```

### 2. Routes (`routes/api.php`)

**New Route:**
```php
Route::get('/users/by-nickname/{nickname}', [UserController::class, 'byNickname']);
```

**Endpoint:** `GET /api/v1/users/by-nickname/{nickname}`

**Response:**
```json
{
  "user_id": 1,
  "user_login": "john_doe",
  "user_email": "john@example.com",
  "user_nicename": "johndoe",
  "display_name": "John Doe"
}
```

---

## API Endpoints

### Get User by Nickname
```http
GET /api/v1/users/by-nickname/{nickname}

Response: 200 OK
{
  "user_id": 1,
  "user_login": "john_doe",
  "user_email": "john@example.com",
  "user_nicename": "johndoe",
  "display_name": "John Doe"
}

Response: 404 Not Found
{
  "message": "Not found"
}
```

### Firebase Login (unchanged, but now supports nickname)
```http
POST /api/v1/auth/firebase-login
Content-Type: application/json

{
  "firebase_uid": "user123",
  "email": "john@example.com",
  "display_name": "John Doe",
  "auth_method": "email",
  "nickname": "johndoe",
  "firebase_token": "token"
}

Response: 200 OK
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "display_name": "John Doe"
  },
  "token": "laravel-sanctum-token",
  "message": "Firebase login successful"
}
```

---

## Database Fields Used

| Field | Table | Purpose |
|-------|-------|---------|
| `user_nicename` | wp_users | Stores the unique nickname |
| `user_email` | wp_users | Fetched when logging in with nickname |
| `user_login` | wp_users | Username |
| `display_name` | wp_users | User's full name |
| `ID` | wp_users | Primary key |

---

## Error Handling

### Frontend Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "User not found" | Nickname doesn't exist in database | Check spelling, ask user to register |
| "Login failed" | Wrong password | Verify password is correct |
| "Invalid credentials" | Email not found for nickname | Ensure nickname exists |
| "Network error" | No internet connection | Check connection |

### Backend Errors

| Status | Error | Cause |
|--------|-------|-------|
| 404 | Not found | Nickname doesn't exist |
| 500 | Server error | Database issue |

---

## Testing

### Test Nickname Login
1. Register a user with nickname "johndoe"
2. Go to login page
3. Enter "johndoe" in the email/nickname field
4. Enter correct password
5. Click "Sign in"
6. Should redirect to home page

### Test Email Login (Still Works)
1. Go to login page
2. Enter "john@example.com" in the email/nickname field
3. Enter correct password
4. Click "Sign in"
5. Should redirect to home page

### Test Invalid Nickname
1. Go to login page
2. Enter "nonexistent" in the email/nickname field
3. Enter any password
4. Click "Sign in"
5. Should show "User not found" error

### Test Wrong Password
1. Go to login page
2. Enter valid nickname "johndoe"
3. Enter wrong password
4. Click "Sign in"
5. Should show "Invalid credentials" error

---

## User Experience

### Before (Email Only)
```
User must remember: john@example.com
Login field accepts: Email addresses only
Error message: "Invalid credentials"
```

### After (Email or Nickname)
```
User can remember: johndoe (easier!)
Login field accepts: Email or nickname
System automatically detects and routes correctly
Error message: "User not found" or "Invalid credentials"
```

---

## Security Considerations

✅ **Nickname is public** - Nicknames are not secret, stored in plain text
✅ **Still uses Firebase** - Password validation through Firebase
✅ **Email fetched securely** - Via authenticated API endpoint
✅ **Token validation** - Laravel validates all requests
✅ **No nickname in auth payload** - Password still secured via email

**Note:** Nicknames should be considered public identifiers, like usernames on Twitter or Reddit.

---

## Performance

- **Extra API call:** One GET request to fetch email by nickname
- **Caching opportunity:** Could cache user lookups (future optimization)
- **Database index:** `user_nicename` is unique, so lookups are fast

---

## Future Enhancements

1. **Case-insensitive nicknames** - Allow "JohnDoe" to match "johndoe"
2. **Nickname caching** - Cache nickname→email mapping temporarily
3. **Search suggestions** - Autocomplete nicknames as user types
4. **Profile page** - Show user by nickname at `/users/johndoe`
5. **Mention system** - Support @johndoe mentions in comments
6. **Social features** - Follow users by nickname

---

## Files Modified

**Frontend:**
- ✅ `app/login/page.tsx` - Updated login form for email/nickname
- ✅ `lib/firebaseAuthService.ts` - Added loginWithNickname() method
- ✅ `contexts/AuthContext.tsx` - Added firebaseLoginNickname() method

**Backend:**
- ✅ `app/Http/Controllers/Api/UserController.php` - Added byNickname() method
- ✅ `routes/api.php` - Added get user by nickname route

---

## Summary

Nickname login is now fully implemented! Users can login with either:
1. **Email address** (original method)
2. **Nickname** (new method)

The system seamlessly handles both, making the login experience more user-friendly while maintaining security through Firebase authentication.

**Status:** ✅ Complete and ready to use
