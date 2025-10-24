'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function FirebasePhoneLoginPage() {
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const { firebasePhoneVerify, firebasePhoneConfirm, isLoading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Initialize reCAPTCHA
    if (typeof window !== 'undefined' && !recaptchaVerifier) {
      try {
        console.log('Initializing reCAPTCHA for domain:', window.location.hostname);
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response: any) => {
            console.log('reCAPTCHA verified', response);
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          },
          'error-callback': () => {
            console.error('reCAPTCHA error');
          },
        });
        setRecaptchaVerifier(verifier);
        console.log('reCAPTCHA initialized successfully');
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
      }
    }

    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.error('Error clearing reCAPTCHA:', error);
        }
      }
    };
  }, [recaptchaVerifier]);

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!phoneNumber) {
      alert('Please enter phone number');
      return;
    }

    if (!recaptchaVerifier) {
      alert('reCAPTCHA is still initializing. Please wait a moment and try again.');
      return;
    }

    try {
      const result = await firebasePhoneVerify(phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('verify');
    } catch (err: any) {
      console.error('Phone verification failed:', err);
      // Handle specific Firebase errors
      if (err?.code === 'auth/captcha-check-failed') {
        alert('reCAPTCHA verification failed. Please ensure your domain is authorized in Firebase Console. Make sure your domain (e.g., localhost, yourdomain.com) is added to Firebase Authentication > Settings > Authorized Domains.');
      } else if (err?.code === 'auth/invalid-phone-number') {
        alert('Invalid phone number. Please include the country code (e.g., +1 for USA).');
      } else {
        alert(err?.message || 'Phone verification failed. Please try again.');
      }
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!smsCode || !confirmationResult) {
      alert('Please enter SMS code');
      return;
    }

    try {
      await firebasePhoneConfirm(confirmationResult, smsCode, phoneNumber);

      // Check if this is a first-time phone login (no password saved yet)
      const savedPhoneAuth = localStorage.getItem('phoneAuthPassword');

      if (!savedPhoneAuth) {
        // First time: redirect to password setup
        const params = new URLSearchParams({
          phone: phoneNumber,
        });
        router.push(`/firebase-phone-password-setup?${params.toString()}`);
      } else {
        // Existing user: go to home
        router.push('/');
      }
    } catch (err) {
      console.error('Code verification failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in with phone
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Back to{' '}
            <Link href="/firebase-login" className="font-medium text-blue-600 hover:text-blue-500">
              login
            </Link>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        {/* Phone Number Step */}
        {step === 'phone' && (
          <form className="mt-8 space-y-6" onSubmit={handlePhoneSubmit}>
            {/* Phone Number */}
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

            {/* reCAPTCHA Container */}
            <div id="recaptcha-container" />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending code...' : 'Send verification code'}
            </button>
          </form>
        )}

        {/* SMS Code Verification Step */}
        {step === 'verify' && (
          <form className="mt-8 space-y-6" onSubmit={handleCodeSubmit}>
            {/* Info Box */}
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="text-sm font-medium text-blue-800">
                  Verification code sent to {phoneNumber}
                </div>
              </div>
            </div>

            {/* SMS Code */}
            <div>
              <label htmlFor="smsCode" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="smsCode"
                type="text"
                inputMode="numeric"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="000000"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">Enter the 6-digit code from your SMS</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify and sign in'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setSmsCode('');
              }}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use different phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
