'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { updatePassword } from 'firebase/auth';
import { apiRequest, tokenStorage, normalizePhoneNumber } from '@/lib/api';

export default function FirebasePhonePasswordSetupPage() {
  const [step, setStep] = useState<'setup' | 'update'>('setup');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated via phone SMS (only once)
    if (isInitialized) return;

    const checkUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('[Phone Password Setup] No user authenticated');
        router.push('/firebase-phone-login');
      } else {
        console.log('[Phone Password Setup] User authenticated:', currentUser.uid);
        setIsInitialized(true);
      }
    };

    checkUser();
  }, [isInitialized, router]);

  const validatePassword = (pwd: string): string => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 6) return 'Password must be at least 6 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    return '';
  };

  // Step 1: Set up password
  const handlePasswordSetup = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate new password
    const error = validatePassword(newPassword);
    if (error) {
      setErrorMessage(error);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Phone Password Setup] Starting password setup process...');

      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.log('[Phone Password Setup] User not authenticated. Please start over.');
        setErrorMessage('Authentication lost. Please start the process again.');
        setStep('setup');
        return;
      }

      // Get phone from Firebase user (stored during SMS verification)
      // Phone should be in the phoneNumber property
      let phoneNumber = currentUser.phoneNumber;

      console.log('[Phone Password Setup] Firebase currentUser properties:', {
        uid: currentUser.uid,
        phoneNumber: phoneNumber,
        displayName: currentUser.displayName,
        email: currentUser.email,
      });

      if (!phoneNumber) {
        console.warn('[Phone Password Setup] phoneNumber not found in currentUser');
        // Try to get phone from localStorage (saved during SMS verification)
        // Check both phoneAuthData and phoneAuthPassword keys
        let phoneAuthDataStr = localStorage.getItem('phoneAuthData');
        if (!phoneAuthDataStr) {
          phoneAuthDataStr = localStorage.getItem('phoneAuthPassword');
        }

        if (phoneAuthDataStr) {
          try {
            const data = JSON.parse(phoneAuthDataStr);
            phoneNumber = data.phoneNumber;
            console.log('[Phone Password Setup] Phone recovered from localStorage:', phoneNumber);
            console.log('[Phone Password Setup] localStorage data keys:', Object.keys(data));
          } catch (e) {
            console.error('[Phone Password Setup] Failed to parse phone auth data from localStorage:', e);
          }
        } else {
          console.warn('[Phone Password Setup] No phone auth data in localStorage');
          console.log('[Phone Password Setup] Available localStorage keys:', Object.keys(localStorage));
        }

        // If still no phone, return error
        if (!phoneNumber) {
          console.error('[Phone Password Setup] ❌ Could not find phone number anywhere');
          setErrorMessage('Phone number not found. Please verify your phone again.');
          return;
        }
      }

      console.log('[Phone Password Setup] Phone number (before normalization):', phoneNumber);

      // Normalize phone first
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      console.log('[Phone Password Setup] Phone normalization:', {
        original: phoneNumber,
        normalized: normalizedPhone,
        length: normalizedPhone.length,
      });

      // Step 1: Update Firebase password
      console.log('[Phone Password Setup] Updating Firebase password...');
      try {
        await updatePassword(currentUser, newPassword);
        console.log('[Phone Password Setup] ✅ Firebase password updated successfully');
      } catch (updatePasswordError: any) {
        console.error('[Phone Password Setup] Firebase password update error:', updatePasswordError);
        throw new Error(`Failed to update password: ${updatePasswordError.message}`);
      }

      // Step 2: Update password in Laravel via dedicated setup endpoint
      console.log('[Phone Password Setup] Updating password in Laravel...');
      console.log('[Phone Password Setup] Request data:', {
        phone: normalizedPhone,
        firebase_uid: currentUser.uid,
        password_length: newPassword.length,
      });

      let setupResponse;
      try {
        setupResponse = await apiRequest('/auth/setup-password-by-phone', {
          method: 'POST',
          body: JSON.stringify({
            phone: normalizedPhone,
            new_password: newPassword,
            firebase_uid: currentUser.uid,
          }),
        });
        console.log('[Phone Password Setup] ✅ Laravel setup response received:', {
          success: setupResponse?.success,
          hasToken: !!setupResponse?.token,
          message: setupResponse?.message,
        });
        console.log('[Phone Password Setup] Full Laravel setup response:', setupResponse);
      } catch (setupError: any) {
        console.error('[Phone Password Setup] Laravel setup API error:', setupError);
        console.error('[Phone Password Setup] Setup error details:', {
          message: setupError.message,
          status: setupError.status,
          statusCode: setupError.statusCode,
          errors: setupError.errors,
          response: setupError.response || setupError.statusText,
        });
        // Log the full error object for debugging
        console.error('[Phone Password Setup] Full error object:', setupError);
        throw new Error(`Laravel password setup failed: ${setupError.message}`);
      }

      if (setupResponse && setupResponse.success && setupResponse.token) {
        console.log('[Phone Password Setup] ✅ Laravel password setup successfully');
        tokenStorage.set(setupResponse.token);
        console.log('[Phone Password Setup] ✅ Sanctum token saved');

        // Step 3: Save password to localStorage for future phone+password logins
        console.log('[Phone Password Setup] Updating localStorage with new password...');
        const phoneAuthData = {
          phoneNumber: normalizedPhone,
          password: newPassword,
          firebaseUid: currentUser.uid,
          tempEmail: `phone_${currentUser.uid}@phone-auth.local`,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('phoneAuthPassword', JSON.stringify(phoneAuthData));
        console.log('[Phone Password Setup] ✅ Password saved to localStorage:', phoneAuthData);

        // Success! Redirect to home
        console.log('[Phone Password Setup] ✅ Password setup complete! Redirecting to home...');
        router.push('/');
      } else {
        console.warn('[Phone Password Setup] Laravel password setup failed - invalid response:', setupResponse);
        setErrorMessage('Could not set up password in backend. Please try again.');
      }
    } catch (err: any) {
      console.error('[Phone Password Setup] Password setup error:', err);

      let errorMsg = 'Failed to set up password. Please try again.';

      if (err.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak. Please use a stronger password.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setErrorMessage(errorMsg);
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
            Complete Your Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create a password to access your account using your phone number
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center gap-2">
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            step === 'setup'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}>
            Setup Password
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-red-800 font-medium text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Password Setup Form */}
        {step === 'setup' && (
          <form onSubmit={handlePasswordSetup} className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-10"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 18a8 8 0 100-16 8 8 0 000 16zM6.623 7.089l.8.8a2 2 0 002.828 0l.6-.6a.75.75 0 10-1.061-1.061l-.6.6a.5.5 0 01-.707 0l-.8-.8a.75.75 0 10-1.06 1.061z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Must contain: uppercase, lowercase, number, 6+ characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-10"
                  placeholder="Confirm password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 18a8 8 0 100-16 8 8 0 000 16zM6.623 7.089l.8.8a2 2 0 002.828 0l.6-.6a.75.75 0 10-1.061-1.061l-.6.6a.5.5 0 01-.707 0l-.8-.8a.75.75 0 10-1.06 1.061z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </button>

            {/* Back Link */}
            <div className="text-center">
              <Link href="/firebase-phone-login" className="text-sm text-blue-600 hover:text-blue-500">
                Back to Phone Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
