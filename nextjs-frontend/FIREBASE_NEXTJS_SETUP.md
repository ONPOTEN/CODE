# Firebase Authentication Setup for Next.js

Complete guide to set up Firebase authentication with multiple providers (Email, Google, Facebook, Apple, Phone) in your Next.js frontend and connect with Laravel backend.

## Table of Contents

1. [Installation](#installation)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Environment Configuration](#environment-configuration)
4. [Implementation](#implementation)
5. [Laravel Backend Integration](#laravel-backend-integration)
6. [Testing](#testing)
7. [Deployment](#deployment)

## Installation

### 1. Install Dependencies

```bash
cd nextjs-frontend
npm install
```

Dependencies have been added to `package.json`:
- `firebase` - Firebase SDK
- `next-auth` - Authentication helper (optional, for advanced features)

### 2. Verify Installation

```bash
npm list firebase
```

Should show `firebase@^11.0.0` or higher.

## Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a new project"
3. Enter project name: `nextjs-frontend` or your preferred name
4. Accept the default settings and click "Create project"
5. Wait for project creation to complete

### Step 2: Enable Authentication Methods

In Firebase Console, go to **Authentication** → **Sign-in method**:

1. **Email/Password**
   - Click "Email/Password"
   - Toggle "Enable"
   - Click "Save"

2. **Google**
   - Click "Google"
   - Toggle "Enable"
   - Select your project from the dropdown
   - Click "Save"

3. **Facebook**
   - Click "Facebook"
   - Toggle "Enable"
   - Enter your Facebook App ID (we'll get this next)
   - Click "Save"

4. **Apple**
   - Click "Apple"
   - Toggle "Enable"
   - Click "Save"

5. **Phone**
   - Click "Phone"
   - Toggle "Enable"
   - Add your reCAPTCHA API key (we'll set this up)
   - Click "Save"

### Step 3: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Select "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
7. Add authorized redirect URIs:
   - `http://localhost:3000/` (development)
   - `https://yourdomain.com/` (production)
8. Copy the Client ID (you'll need this)

### Step 4: Set Up Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add "Facebook Login" product
4. Go to **Settings** → **Basic** and note your App ID and App Secret
5. In **Facebook Login** settings:
   - Add `http://localhost:3000` to Valid OAuth Redirect URIs
   - Add `https://yourdomain.com` for production
6. Go back to Firebase Console and enter the Facebook App ID

### Step 5: Set Up Apple Sign-In

1. In Firebase Console, go to **Authentication** → **Sign-in method** → **Apple**
2. You'll need an Apple Developer account
3. Configure in Xcode (if developing on iOS)
4. For web, no additional setup needed

### Step 6: Set Up reCAPTCHA

1. Go to [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin)
2. Create new site
   - Name: Your app name
   - reCAPTCHA type: reCAPTCHA v3 (or v2 Invisible)
   - Domains: localhost, yourdomain.com
3. Copy the Site Key and Secret Key
4. In Firebase Console:
   - Go to **Authentication** → **Sign-in method** → **Phone**
   - Enable reCAPTCHA keys
   - Paste your Site Key and Secret Key

## Environment Configuration

### 1. Create .env.local

Create `nextjs-frontend/.env.local` with your Firebase credentials:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Facebook
NEXT_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id

# Backend API
NEXT_PUBLIC_API_URL=https://centimet2.com:8000/api/v1
```

### 2. Get Your Credentials

**From Firebase Console:**

1. Go to **Project Settings** (gear icon)
2. Select your app (if multiple)
3. Copy and paste credentials to `.env.local`

**Important:** The `NEXT_PUBLIC_` prefix means these are exposed to the browser. This is fine for Firebase API keys as they have security rules.

### 3. Add to .gitignore

Make sure `.env.local` is in your `.gitignore`:

```
.env.local
.env.*.local
```

## Implementation

### File Structure

```
nextjs-frontend/
├── lib/
│   ├── firebase.ts                 ← Firebase SDK init
│   ├── firebaseAuthService.ts      ← Authentication logic
│   └── api.ts                      ← API requests
├── contexts/
│   └── AuthContext.tsx             ← Auth state management
├── app/
│   ├── firebase-login/
│   │   └── page.tsx                ← Login page
│   ├── firebase-signup/
│   │   └── page.tsx                ← Signup page
│   ├── firebase-phone-login/
│   │   └── page.tsx                ← Phone auth page
│   └── login/
│       └── page.tsx                ← Traditional login (keep existing)
└── FIREBASE_NEXTJS_SETUP.md        ← This file
```

### Key Files Created

1. **`lib/firebase.ts`** - Firebase SDK initialization
   - Initializes Firebase with your credentials
   - Exports auth, providers, and auth functions
   - Only runs in browser environment

2. **`lib/firebaseAuthService.ts`** - Authentication service
   - Handles all authentication methods
   - Integrates with Laravel backend
   - Manages tokens and error messages

3. **`contexts/AuthContext.tsx`** - Authentication state
   - React Context for global auth state
   - Provides hooks for all auth methods
   - Manages loading and error states

4. **Authentication Pages**
   - `firebase-login/page.tsx` - All sign-in methods
   - `firebase-signup/page.tsx` - Email registration
   - `firebase-phone-login/page.tsx` - Phone verification

### Usage in Components

#### Using the useAuth Hook

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    firebaseLoginGoogle,
    logout,
  } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome {user?.display_name}</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={firebaseLoginGoogle}>
      Sign in with Google
    </button>
  );
}
```

#### All Available Methods

```tsx
const {
  // State
  user,                      // Current user object
  isAuthenticated,           // Boolean
  isLoading,                 // During auth operations
  error,                     // Error message
  authMethod,                // 'google', 'facebook', etc.

  // Traditional auth (keep existing)
  register,                  // Email registration
  login,                     // Email login
  logout,                    // Logout

  // Firebase email
  firebaseRegister,          // Firebase email registration
  firebaseLoginEmail,        // Firebase email login

  // Social login
  firebaseLoginGoogle,       // Google sign-in
  firebaseLoginFacebook,     // Facebook sign-in
  firebaseLoginApple,        // Apple sign-in

  // Phone
  firebasePhoneVerify,       // Start phone verification
  firebasePhoneConfirm,      // Confirm SMS code
} = useAuth();
```

## Laravel Backend Integration

### API Endpoints Required

Your Laravel backend needs two endpoints for Firebase authentication:

#### 1. Firebase Registration

**Endpoint:** `POST /api/auth/firebase-register`

**Request:**
```json
{
  "firebase_uid": "abc123xyz",
  "email": "user@example.com",
  "display_name": "John Doe",
  "nickname": "johndoe",
  "username": "johndoe",
  "firebase_token": "firebase-id-token",
  "hobby": "optional",
  "company": "optional",
  "location": "optional"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "user@example.com",
    "display_name": "John Doe"
  },
  "token": "laravel-jwt-token"
}
```

#### 2. Firebase Login

**Endpoint:** `POST /api/auth/firebase-login`

**Request:**
```json
{
  "firebase_uid": "abc123xyz",
  "email": "user@example.com",
  "display_name": "John Doe",
  "auth_method": "google|facebook|apple|email|phone",
  "phone_number": "optional",
  "firebase_token": "firebase-id-token"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "user@example.com",
    "display_name": "John Doe"
  },
  "token": "laravel-jwt-token"
}
```

### Laravel Controller Implementation

**File:** `app/Http/Controllers/FirebaseAuthController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class FirebaseAuthController extends Controller
{
    public function firebaseRegister(Request $request)
    {
        $validated = $request->validate([
            'firebase_uid' => 'required|string|unique:users,firebase_uid',
            'email' => 'required|email|unique:users,email',
            'display_name' => 'required|string',
            'nickname' => 'required|string|unique:users,nickname',
            'username' => 'required|string|unique:users,username',
        ]);

        try {
            $user = User::create([
                'firebase_uid' => $validated['firebase_uid'],
                'username' => $validated['username'],
                'nickname' => $validated['nickname'],
                'email' => $validated['email'],
                'display_name' => $validated['display_name'],
                'hobby' => $request->hobby,
                'company' => $request->company,
                'location' => $request->location,
                'email_verified_at' => now(),
                'password' => Hash::make(Str::random(32)),
            ]);

            $token = $user->createToken('firebase-auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'user' => $user,
                'token' => $token,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function firebaseLogin(Request $request)
    {
        $validated = $request->validate([
            'firebase_uid' => 'required|string',
            'email' => 'required|email',
            'display_name' => 'required|string',
            'auth_method' => 'required|string',
        ]);

        try {
            $user = User::firstOrCreate(
                ['firebase_uid' => $validated['firebase_uid']],
                [
                    'username' => Str::slug($validated['display_name']) . '_' . Str::random(5),
                    'email' => $validated['email'],
                    'display_name' => $validated['display_name'],
                    'phone' => $request->phone_number,
                    'email_verified_at' => now(),
                    'password' => Hash::make(Str::random(32)),
                ]
            );

            $user->update([
                'last_login_at' => now(),
                'auth_method' => $validated['auth_method'],
            ]);

            $token = $user->createToken('firebase-auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'user' => $user,
                'token' => $token,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
```

### Update Routes

**File:** `routes/api.php`

```php
Route::post('/auth/firebase-register', [FirebaseAuthController::class, 'firebaseRegister']);
Route::post('/auth/firebase-login', [FirebaseAuthController::class, 'firebaseLogin']);
```

### Update User Model

Add these fields to your users table migration:

```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('username')->unique();
    $table->string('email')->unique();
    $table->string('display_name');
    $table->string('firebase_uid')->nullable()->unique();
    $table->string('password')->nullable();
    $table->string('auth_method')->default('email');
    $table->timestamp('last_login_at')->nullable();
    // ... other fields
    $table->timestamps();
});
```

## Testing

### Test Email/Password

1. Go to `http://localhost:3000/firebase-signup`
2. Enter email, password, and display name
3. Click "Create account"
4. Should redirect to home page
5. Check Firebase Console → Authentication → Users

### Test Google Sign-In

1. Go to `http://localhost:3000/firebase-login`
2. Click "Google" button
3. Select Google account
4. Should redirect to home page
5. Verify user in Firebase Console

### Test Facebook Sign-In

1. Make sure Facebook App is configured
2. Click "Facebook" button
3. Authorize app
4. Should redirect to home page

### Test Apple Sign-In

1. Only works on macOS/iOS with valid developer account
2. Click "Apple" button
3. Authorize with Apple ID
4. Should redirect to home page

### Test Phone Sign-In

1. Go to `http://localhost:3000/firebase-phone-login`
2. Enter phone number with country code
3. Enter display name
4. Receive SMS code
5. Enter code
6. Should redirect to home page

## Deployment

### Vercel Deployment

1. **Update Environment Variables**
   - Go to Vercel Dashboard
   - Select your project
   - Settings → Environment Variables
   - Add all `NEXT_PUBLIC_*` variables from `.env.local`

2. **Update Firebase Settings**
   - In Firebase Console → Authentication → Authorized domains
   - Add your Vercel domain: `yourdomain.vercel.app`

3. **Update OAuth Credentials**
   - Google: Add `yourdomain.vercel.app` to authorized origins
   - Facebook: Add `yourdomain.vercel.app` to App Domains
   - Apple: Add your custom domain

4. **Deploy**
   ```bash
   git push origin main
   ```
   Vercel will automatically deploy

### Self-Hosted Deployment

1. **Build**
   ```bash
   npm run build
   ```

2. **Set Environment Variables**
   ```bash
   export NEXT_PUBLIC_FIREBASE_API_KEY=...
   export NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   # etc.
   ```

3. **Start**
   ```bash
   npm start
   ```

## Troubleshooting

### "Firebase not initialized"

**Solution:**
- Verify `.env.local` has all Firebase credentials
- Credentials must start with `NEXT_PUBLIC_` to be exposed to browser
- Check browser console for specific errors

### "Google sign-in popup blocked"

**Solution:**
- User browser popup blocker
- Ensure button click directly triggers sign-in
- No timers or async operations before popup

### "Facebook App not configured"

**Solution:**
- Verify App ID in `.env.local`
- Check App Status is Live in Facebook Developers
- Verify Valid OAuth Redirect URIs

### "Phone verification fails"

**Solution:**
- Phone number must include country code (+1 for USA)
- reCAPTCHA must be configured
- SMS may take minutes to arrive
- Check Firebase Console for quota limits

### "Backend endpoint not found"

**Solution:**
- Verify endpoints exist in Laravel `routes/api.php`
- Check API URL in `.env.local` is correct
- Verify CORS allows your frontend origin

### "Token not saved"

**Solution:**
- Check browser localStorage is enabled
- Verify `tokenStorage.set()` is called
- Check browser DevTools → Application → Local Storage

## Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use environment variables** for all secrets
3. **Validate on backend** - Never trust client-side validation
4. **Implement rate limiting** - Prevent brute force attacks
5. **Use HTTPS only** - In production
6. **Handle errors gracefully** - Show user-friendly messages
7. **Test all auth methods** - Don't skip any
8. **Monitor Firebase quotas** - SMS, reCAPTCHA usage
9. **Keep credentials updated** - Rotate keys regularly
10. **Log authentication events** - For security auditing

## Security Checklist

- [ ] Firebase API key is public (OK for Firebase)
- [ ] `.env.local` is in `.gitignore`
- [ ] Backend validates Firebase tokens
- [ ] CORS allows only your frontend domain
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS enabled in production
- [ ] Firebase Security Rules configured
- [ ] Phone verification requires reCAPTCHA
- [ ] Sensitive errors not logged client-side
- [ ] Regular security audits scheduled

---

**Status:** Ready for development
**Last Updated:** October 2025
**Version:** 1.0.0
