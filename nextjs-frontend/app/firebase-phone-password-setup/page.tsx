'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { apiRequest } from '@/lib/api';
import { linkWithCredential, EmailAuthProvider, updateProfile, updatePassword } from 'firebase/auth';

export default function FirebasePhonePasswordSetupPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('phone');

  // Get user data from previous phone verification
  useEffect(() => {
    if (!phoneNumber) {
      router.push('/firebase-phone-login');
    }
  }, [phoneNumber, router]);

  const validatePassword = (pwd: string): string => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 6) return 'Password must be at least 6 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    return '';
  };

  const handlePasswordSetup = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Validate password
    const error = validatePassword(password);
    if (error) {
      setPasswordError(error);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (!displayName || !nickname) {
      setPasswordError('Display name and nickname are required');
      return;
    }

    setIsLoading(true);

    try {
      // Get the currently signed-in user (from phone SMS verification)
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('No user authenticated. Please verify phone first.');
      }

      console.log(`[Phone Password Setup] Creating email+password account for phone user...`);
      console.log(`  - Firebase UID: ${currentUser.uid}`);
      console.log(`  - Phone: ${phoneNumber}`);
      console.log(`  - Display Name: ${displayName}`);

      // Generate temporary email for this phone user
      // Format: phone_{firebaseUid}@phone-auth.local
      const tempEmail = `phone_${currentUser.uid}@phone-auth.local`;

      // Step 1: Update Firebase user profile
      await updateProfile(currentUser, {
        displayName: displayName,
      });
      console.log(`[Phone Password Setup] Firebase profile updated`);

      // Step 2: Link email+password credentials to the phone-verified account
      // This is the KEY step - it creates email+password auth provider on the existing phone user
      console.log(`[Phone Password Setup] Linking email+password provider...`);
      try {
        const credential = EmailAuthProvider.credential(tempEmail, password);
        await linkWithCredential(currentUser, credential);
        console.log(`[Phone Password Setup] Email+password provider linked successfully`);
      } catch (linkError: any) {
        console.error(`[Phone Password Setup] Failed to link credentials:`, linkError);

        // If linking fails, try updating email first and then password
        if (linkError.code === 'auth/email-already-in-use') {
          throw new Error('This email is already in use. Please try a different one.');
        } else if (linkError.code === 'auth/invalid-email') {
          throw new Error('Invalid email format.');
        } else if (linkError.code === 'auth/provider-already-linked') {
          console.log(`[Phone Password Setup] Email+password provider already linked, updating password...`);
          // Try updating password instead
          try {
            await updatePassword(currentUser, password);
            console.log(`[Phone Password Setup] Password updated successfully`);
          } catch (updateError: any) {
            throw new Error(`Failed to set password: ${updateError.message}`);
          }
        } else {
          throw linkError;
        }
      }

      // Step 3: Save password to localStorage for future phone+password logins
      // NOTE: The user was already created in Laravel during phone SMS verification (confirmPhoneCode)
      // We don't need to register again - just save the password for future logins
      console.log(`[Phone Password Setup] Saving password for future logins...`);
      const phoneAuthData = {
        phoneNumber,
        password,
        firebaseUid: currentUser.uid,
        tempEmail,
        displayName,
        nickname,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('phoneAuthPassword', JSON.stringify(phoneAuthData));
      console.log(`[Phone Password Setup] Password saved to localStorage`);

      // Step 4: Verify Sanctum token exists (should have been set during phone verification)
      const sanctumToken = localStorage.getItem('api_token');
      if (sanctumToken) {
        console.log(`[Phone Password Setup] Sanctum token confirmed, user is authenticated`);
      } else {
        console.log(`[Phone Password Setup] Note: Sanctum token not found, will be obtained during next login`);
      }

      console.log(`[Phone Password Setup] Setup complete! Redirecting to home...`);
      // Redirect to home
      router.push('/');
    } catch (err: any) {
      console.error('[Phone Password Setup] Error:', err);

      let errorMessage = 'Failed to set up password. Please try again.';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This account already exists. Please log in instead.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setPasswordError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set up your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create a password to access your account on future logins using your phone number
          </p>
        </div>

        {/* Phone Info */}
        {phoneNumber && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="text-sm text-blue-800">
              <p className="font-medium">Phone: {phoneNumber}</p>
              <p className="text-xs mt-1">Complete your profile to finish setup</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {passwordError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm font-medium text-red-800">{passwordError}</div>
          </div>
        )}

        {/* Password Form */}
        <form className="mt-8 space-y-6" onSubmit={handlePasswordSetup}>
          {/* Display Name Input */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Nickname Input */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              autoComplete="username"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., johndoe"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Unique username for your profile
            </p>
          </div>
          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Must contain uppercase, lowercase, number, and be at least 6 characters
            </p>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
              <div className="space-y-1 text-sm">
                <p className={password.length >= 6 ? 'text-green-600' : 'text-gray-500'}>
                  ✓ At least 6 characters
                </p>
                <p className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  ✓ Uppercase letter
                </p>
                <p className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  ✓ Lowercase letter
                </p>
                <p className={/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  ✓ Number
                </p>
                <p className={password === confirmPassword && confirmPassword ? 'text-green-600' : 'text-gray-500'}>
                  ✓ Passwords match
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password || password !== confirmPassword || !displayName || !nickname}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Back Link */}
        <p className="text-center text-sm text-gray-600">
          <Link href="/firebase-login" className="font-medium text-blue-600 hover:text-blue-500">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
