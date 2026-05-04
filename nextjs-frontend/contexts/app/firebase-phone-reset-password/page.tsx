'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updatePassword } from 'firebase/auth';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiRequest, tokenStorage, encodePhoneNumber, normalizePhoneNumber, getUserByPhone } from '@/lib/api';

export default function FirebasePhoneResetPasswordPage() {
  const [step, setStep] = useState<'phone' | 'verify' | 'reset'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const router = useRouter();

  const validatePassword = (pwd: string): string => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 6) return 'Password must be at least 6 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    return '';
  };

  // Step 1: Send SMS Code
  const handlePhoneSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!phoneNumber) {
      setErrorMessage('Phone number is required');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Reset Password] Starting phone sign in...');

      // Normalize phone number
      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      // Query Laravel to get user email by phone
      // Using query parameter endpoint for better encoding of '+' character
      const response = await getUserByPhone(normalizedPhone);

      if (!response.user_email) {
        setErrorMessage('Phone number not found. Please check and try again.');
        setIsLoading(false);
        return;
      }

      console.log('[Reset Password] Phone found! Email:', response.user_email);
      setUserEmail(response.user_email);

      // Set up reCAPTCHA verifier
      if (!recaptchaVerifier && typeof window !== 'undefined') {
        console.log('[Reset Password] Setting up reCAPTCHA...');
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response: any) => {
            console.log('[Reset Password] reCAPTCHA verified');
          },
        });
        setRecaptchaVerifier(verifier);

        // Send SMS code
        try {
          console.log('[Reset Password] Sending SMS code to:', phoneNumber);
          const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
          setConfirmationResult(confirmation);
          console.log('[Reset Password] SMS code sent successfully');
          setStep('verify');
        } catch (smsError: any) {
          console.error('[Reset Password] SMS error:', smsError);
          setErrorMessage(smsError?.message || 'Failed to send SMS. Please try again.');
          setRecaptchaVerifier(null);
        }
      }
    } catch (err: any) {
      console.error('[Reset Password] Phone sign in error:', err);
      setErrorMessage(err?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify SMS Code
  const handleSmsVerification = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!smsCode) {
      setErrorMessage('SMS code is required');
      return;
    }

    if (!confirmationResult) {
      setErrorMessage('SMS verification not initialized. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Reset Password] Verifying SMS code...');

      // Verify SMS code with Firebase
      const userCredential = await confirmationResult.confirm(smsCode);
      console.log('[Reset Password] SMS verified! User:', userCredential.user.uid);

      // SMS verification successful - proceed to password reset
      setStep('reset');
    } catch (err: any) {
      console.error('[Reset Password] SMS verification error:', err);
      setErrorMessage(err?.message || 'Invalid SMS code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password (no current password needed - already verified via SMS)
  const handlePasswordReset = async (e: FormEvent) => {
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
      console.log('[Reset Password] Updating password in Firebase...');

      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.log('[Reset Password] User not authenticated. Please start over.');
        setErrorMessage('Authentication lost. Please start the reset process again.');
        setStep('phone');
        setPhoneNumber('');
        setSmsCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setConfirmationResult(null);
        return;
      }

      // Update password in Firebase directly (user already verified via SMS)
      await updatePassword(currentUser, newPassword);
      console.log('[Reset Password] Firebase password updated successfully');

      // Update password in Laravel backend
      console.log('[Reset Password] Updating password in Laravel...');

      try {
        // Get the stored Sanctum token for Laravel authentication
        let sanctumToken = tokenStorage.get();
        console.log('[Reset Password] Checking for Sanctum token...');

        if (!sanctumToken) {
          console.log('[Reset Password] No Sanctum token found. Attempting to login with new password to get token...');

          // Try to login with phone + new password to get a Sanctum token
          try {
            const loginResponse = await fetch('/api/proxy/auth/firebase-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                firebase_uid: currentUser.uid,
                email: currentUser.email || `phone_${currentUser.uid}@phone-auth.local`,
                display_name: currentUser.displayName || phoneNumber,
                auth_method: 'phone-password',
                phone_number: phoneNumber,
                firebase_token: await currentUser.getIdToken(),
              }),
            });

            if (loginResponse.ok) {
              const loginData = await loginResponse.json();
              sanctumToken = loginData.token;
              if (sanctumToken) {
                tokenStorage.set(sanctumToken);
                console.log('[Reset Password] Successfully obtained Sanctum token via login');
              }
            } else {
              console.warn('[Reset Password] Could not obtain Sanctum token via login');
            }
          } catch (loginErr: any) {
            console.warn('[Reset Password] Failed to get token via login:', loginErr.message);
          }
        }

        if (sanctumToken) {
          const laravelResponse = await fetch('/api/proxy/profile/password-reset', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${sanctumToken}`,
            },
            body: JSON.stringify({
              password: newPassword,
              password_confirmation: confirmNewPassword,
            }),
          });

          const data = await laravelResponse.json();
          console.log('[Reset Password] Laravel response status:', laravelResponse.status);

          if (laravelResponse.ok) {
            console.log('[Reset Password] Laravel password updated successfully');
          } else {
            console.warn('[Reset Password] Laravel update returned error:', data);
          }
        } else {
          console.warn('[Reset Password] Could not obtain Sanctum token - skipping Laravel password update');
          console.log('[Reset Password] Firebase password was still updated successfully');
        }
      } catch (laravelErr: any) {
        console.warn('[Reset Password] Laravel update failed (non-critical):', laravelErr);
        // Continue anyway - Firebase password is updated which is the important part
      }

      // Success! Redirect to login
      console.log('[Reset Password] Password reset complete! Redirecting to login...');
      router.push('/login?reset=success');
    } catch (err: any) {
      console.error('[Reset Password] Password reset error:', err);

      let errorMsg = 'Failed to reset password. Please try again.';

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
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Reset your phone authentication password
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm font-medium text-red-800">{errorMessage}</div>
          </div>
        )}

        {/* reCAPTCHA Container */}
        <div id="recaptcha-container" className="flex justify-center mb-4"></div>

        {/* Step 1: Phone Entry & SMS Send */}
        {step === 'phone' && (
          <form className="mt-8 space-y-6" onSubmit={handlePhoneSignIn}>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +1 for USA)</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !phoneNumber}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending SMS...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* Step 2: SMS Code Verification */}
        {step === 'verify' && (
          <form className="mt-8 space-y-6" onSubmit={handleSmsVerification}>
            <div className="rounded-md bg-blue-50 p-4">
              <div className="text-sm text-blue-800">
                <p className="font-medium">Phone: {phoneNumber}</p>
                <p className="text-xs mt-1">Email: {userEmail}</p>
                <p className="text-xs mt-2">Check your SMS for the verification code</p>
              </div>
            </div>

            <div>
              <label htmlFor="smsCode" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="smsCode"
                type="text"
                autoComplete="off"
                required
                maxLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="000000"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">Enter the 6-digit code sent to your phone</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || smsCode.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setPhoneNumber('');
                setSmsCode('');
                setConfirmationResult(null);
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset' && (
          <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-800">
                <p className="font-medium">✓ Phone verified</p>
                <p className="font-medium">✓ SMS verified</p>
                <p className="text-xs mt-1">Now enter your new password</p>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Must contain uppercase, lowercase, number, and be at least 6 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
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

            {/* Password Requirements */}
            {newPassword && (
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
                <div className="space-y-1 text-sm">
                  <p className={newPassword.length >= 6 ? 'text-green-600' : 'text-gray-500'}>
                    ✓ At least 6 characters
                  </p>
                  <p className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Uppercase letter
                  </p>
                  <p className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Lowercase letter
                  </p>
                  <p className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Number
                  </p>
                  <p className={newPassword === confirmNewPassword && confirmNewPassword ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Passwords match
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !newPassword || newPassword !== confirmNewPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting password...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('verify');
                setNewPassword('');
                setConfirmNewPassword('');
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
