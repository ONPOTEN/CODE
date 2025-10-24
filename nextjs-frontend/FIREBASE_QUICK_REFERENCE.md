# Firebase Next.js - Quick Reference

Fast-track guide to get Firebase authentication running in 30 minutes.

## Step 1: Install (2 min)

```bash
npm install
```

Packages already added to `package.json`:
- ✅ firebase
- ✅ next-auth (optional)

## Step 2: Get Firebase Credentials (5 min)

1. Go to https://console.firebase.google.com/
2. Create new project or select existing
3. Project Settings → General tab
4. Copy all credentials

## Step 3: Create .env.local (2 min)

```bash
# nextjs-frontend/.env.local
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_API_URL=https://centimet2.com:8000/api/v1
```

## Step 4: Enable Authentication Methods (5 min)

In Firebase Console → Authentication → Sign-in method:
- ✅ Email/Password
- ✅ Google
- ✅ Facebook
- ✅ Apple
- ✅ Phone

## Step 5: Configure Social Providers (10 min)

### Google
- Google Cloud Console → APIs & Services → Credentials
- OAuth 2.0 Client ID → Web application
- Add origins: localhost:3000, yourdomain.com

### Facebook
- Facebook Developers → Create app
- Facebook Login → Settings
- Add domain: localhost:3000, yourdomain.com
- Get App ID

### Apple
- Firebase Console → Apple → Enable
- No extra setup needed for web

### Phone
- Firebase Console → Phone → Enable
- Get reCAPTCHA Site Key
- Add to Firebase settings

## Step 6: Update .env.local with Optional Services

```bash
# Optional social credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
```

## Step 7: Set Up Laravel Endpoints (10 min)

Create controller: `app/Http/Controllers/FirebaseAuthController.php`

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
        $user = User::create([
            'firebase_uid' => $request->firebase_uid,
            'username' => $request->username,
            'nickname' => $request->nickname,
            'email' => $request->email,
            'display_name' => $request->display_name,
            'email_verified_at' => now(),
            'password' => Hash::make(Str::random(32)),
        ]);

        $token = $user->createToken('firebase-auth')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function firebaseLogin(Request $request)
    {
        $user = User::firstOrCreate(
            ['firebase_uid' => $request->firebase_uid],
            [
                'username' => Str::slug($request->display_name) . '_' . Str::random(5),
                'email' => $request->email,
                'display_name' => $request->display_name,
                'email_verified_at' => now(),
                'password' => Hash::make(Str::random(32)),
            ]
        );

        $token = $user->createToken('firebase-auth')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => $user,
            'token' => $token,
        ]);
    }
}
```

Add routes: `routes/api.php`

```php
Route::post('/auth/firebase-register', [FirebaseAuthController::class, 'firebaseRegister']);
Route::post('/auth/firebase-login', [FirebaseAuthController::class, 'firebaseLogin']);
```

## Step 8: Test in Browser

### Test URLs

- **Email Login:** http://localhost:3000/firebase-login
- **Email Signup:** http://localhost:3000/firebase-signup
- **Phone Login:** http://localhost:3000/firebase-phone-login

### What to Test

```
✓ Click "Email Login" → Enter email/password → Should redirect home
✓ Click "Sign up" → Create account → Should redirect home
✓ Click "Google" → Select account → Should redirect home
✓ Click "Facebook" → Authorize → Should redirect home
✓ Click "Apple" → Authorize → Should redirect home
✓ Click "Phone" → Enter number → Receive SMS → Should redirect home
```

## Using in Components

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

  if (!isAuthenticated) {
    return <button onClick={firebaseLoginGoogle}>Sign in</button>;
  }

  return (
    <div>
      <p>Welcome {user?.display_name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Available Authentication Methods

```tsx
const {
  // Email
  firebaseRegister,        // Firebase email registration
  firebaseLoginEmail,      // Firebase email login

  // Social
  firebaseLoginGoogle,     // Google sign-in
  firebaseLoginFacebook,   // Facebook sign-in
  firebaseLoginApple,      // Apple sign-in

  // Phone
  firebasePhoneVerify,     // Start phone verification
  firebasePhoneConfirm,    // Confirm SMS code

  // Other
  logout,                  // Sign out
  user,                    // Current user
  isAuthenticated,         // Boolean
  isLoading,               // During operations
  error,                   // Error message
} = useAuth();
```

## File Structure

```
nextjs-frontend/
├── lib/
│   ├── firebase.ts                    ← Firebase init
│   ├── firebaseAuthService.ts         ← Auth logic
│   └── api.ts                         ← API calls
├── contexts/
│   └── AuthContext.tsx                ← Auth state
├── app/
│   ├── firebase-login/page.tsx        ← All sign-in methods
│   ├── firebase-signup/page.tsx       ← Registration
│   ├── firebase-phone-login/page.tsx  ← Phone auth
│   └── login/page.tsx                 ← Keep existing
└── FIREBASE_NEXTJS_SETUP.md           ← Full guide
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase not initialized" | Check `.env.local` has all credentials, restart dev server |
| "Google popup blocked" | Check browser popup settings, allow localhost |
| "Facebook App not set up" | Get App ID from Facebook Developers, add to `.env.local` |
| "Phone SMS not received" | Use real number with country code, wait 1-2 minutes |
| "Backend 404 error" | Create Firebase endpoints in Laravel, check API URL |
| "Token not saved" | Enable localStorage in browser, check DevTools |
| "Auth state not updating" | Wrap component with AuthProvider, use useAuth hook |

## Environment Variables Checklist

```bash
# Required for Firebase
NEXT_PUBLIC_FIREBASE_API_KEY         ✓
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN     ✓
NEXT_PUBLIC_FIREBASE_PROJECT_ID      ✓
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET  ✓
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  ✓
NEXT_PUBLIC_FIREBASE_APP_ID          ✓

# Required for Backend
NEXT_PUBLIC_API_URL                  ✓

# Optional but recommended
NEXT_PUBLIC_GOOGLE_CLIENT_ID         (for better Google config)
NEXT_PUBLIC_FACEBOOK_APP_ID          (for better Facebook config)
```

## Production Checklist

- [ ] All environment variables set in Vercel/hosting
- [ ] Firebase Authorized Domains updated with production URL
- [ ] Google OAuth origins include production domain
- [ ] Facebook app domains include production domain
- [ ] Laravel CORS allows production frontend domain
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured on auth endpoints
- [ ] Error logs monitored
- [ ] Firebase quotas checked (SMS, etc.)

## Next Steps

1. ✅ Install packages: `npm install`
2. ✅ Create `.env.local` with Firebase credentials
3. ✅ Enable auth methods in Firebase Console
4. ✅ Set up social provider credentials
5. ✅ Create Laravel Firebase endpoints
6. ✅ Test all authentication methods
7. ✅ Deploy to production

## Full Documentation

For complete setup instructions, see [FIREBASE_NEXTJS_SETUP.md](FIREBASE_NEXTJS_SETUP.md)

## Support

- Firebase Docs: https://firebase.google.com/docs
- Next.js Docs: https://nextjs.org/docs
- Firebase SDK: https://github.com/firebase/firebase-js-sdk

---

**Time to implement:** ~30 minutes
**Status:** Ready to start
**Last Updated:** October 2025
