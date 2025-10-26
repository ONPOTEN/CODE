'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updatePassword } from 'firebase/auth';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiRequest, tokenStorage, encodePhoneNumber, normalizePhoneNumber, getUserByPhone, validateFirebasePhoneNumber } from '@/lib/api';

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

    // Validate and normalize phone number (auto-adds +84 prefix)
    const validation = validateFirebasePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid phone number');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Reset Password] Starting phone sign in...');
      console.log(`[Reset Password] Phone: ${phoneNumber} → ${validation.normalized}`);

      // Use normalized phone with +84 prefix
      const normalizedPhone = validation.normalized!;

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
          console.log('[Reset Password] Sending SMS code to:', normalizedPhone);
          const confirmation = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
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
      console.log('[Reset Password] Starting password reset process...');

      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.log('[Reset Password] User not authenticated. Please start over.');
        setErrorMessage('Authentication lost. Please start the reset process again.');
        setStep('phone');
        return;
      }

      // Normalize phone number for lookup
      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      // Step 1: Update password in Firebase (user already verified via SMS)
      console.log('[Reset Password] Updating password in Firebase...');
      await updatePassword(currentUser, newPassword);
      console.log('[Reset Password] ✅ Firebase password updated successfully');

      // Step 2: Update password in Laravel via dedicated reset endpoint
      console.log('[Reset Password] Updating password in Laravel...');
      console.log('[Reset Password] Request data:', {
        phone: normalizedPhone,
        firebase_uid: currentUser.uid,
        password_length: newPassword.length,
      });

      let resetResponse;
      try {
        resetResponse = await apiRequest('/auth/reset-password-by-phone', {
          method: 'POST',
          body: JSON.stringify({
            phone: normalizedPhone,
            new_password: newPassword,
            firebase_uid: currentUser.uid,
          }),
        });
        console.log('[Reset Password] ✅ Laravel reset response received:', {
          success: resetResponse?.success,
          hasToken: !!resetResponse?.token,
          userInfo: resetResponse?.user,
          message: resetResponse?.message,
        });
        console.log('[Reset Password] Full Laravel reset response:', resetResponse);
      } catch (resetError: any) {
        console.error('[Reset Password] Laravel reset API error:', resetError);
        console.error('[Reset Password] Reset error details:', {
          message: resetError.message,
          status: resetError.status,
          errors: resetError.errors,
        });
        throw new Error(`Laravel password update failed: ${resetError.message}`);
      }

      if (resetResponse && resetResponse.success && resetResponse.token) {
        console.log('[Reset Password] ✅ Laravel password updated successfully');
        tokenStorage.set(resetResponse.token);
        console.log('[Reset Password] ✅ Sanctum token saved');

        // Step 3: Update localStorage with new password for future logins
        console.log('[Reset Password] Updating localStorage with new password...');
        const phoneAuthData = {
          phoneNumber: normalizedPhone,
          password: newPassword,
          firebaseUid: currentUser.uid,
          tempEmail: `phone_${currentUser.uid}@phone-auth.local`,
          displayName: currentUser.displayName || phoneNumber,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('phoneAuthPassword', JSON.stringify(phoneAuthData));
        console.log('[Reset Password] ✅ Password saved to localStorage:', phoneAuthData);

        // Success! Redirect to login
        console.log('[Reset Password] ✅ Password reset complete! Redirecting to login...');
        router.push('/login?reset=success');
      } else {
        console.warn('[Reset Password] Laravel password update failed - invalid response:', resetResponse);
        setErrorMessage('Could not update password in backend. Please try again.');
      }
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
