'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'email-nickname' | 'phone-password' | 'phone-sms'>('email-nickname');
  const [emailOrNickname, setEmailOrNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'phone' | 'verify'>('phone');
  const [smsCode, setSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const { firebaseLoginEmail, firebaseLoginNickname, firebaseLoginPhonePassword, firebasePhoneVerify, firebasePhoneConfirm, firebaseLoginGoogle, firebaseLoginFacebook, firebaseLoginApple, isLoading, error } = useAuth();
  const router = useRouter();

  // Initialize reCAPTCHA for phone SMS authentication
  useEffect(() => {
    if (loginMethod === 'phone-sms' && typeof window !== 'undefined' && !recaptchaVerifier) {
      try {
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
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
      }
    }

    return () => {
      if (recaptchaVerifier && loginMethod === 'phone-sms') {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.error('Error clearing reCAPTCHA:', error);
        }
      }
    };
  }, [loginMethod, recaptchaVerifier]);

  const handleEmailOrNicknameLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // Check if input is an email (contains @) or nickname
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

  const handlePhonePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!phoneNumber) {
      alert('Please enter phone number');
      return;
    }

    if (!phonePassword) {
      alert('Please enter password');
      return;
    }

    try {
      await firebaseLoginPhonePassword(phoneNumber, phonePassword);
      router.push('/');
    } catch (err) {
      console.error('Phone password login failed:', err);
    }
  };

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
      setPhoneStep('verify');
    } catch (err: any) {
      console.error('Phone verification failed:', err);
      if (err?.code === 'auth/captcha-check-failed') {
        alert('reCAPTCHA verification failed. Please ensure your domain is authorized in Firebase Console.');
      } else if (err?.code === 'auth/invalid-phone-number') {
        alert('Invalid phone number. Please include the country code (e.g., +1 for USA).');
      } else {
        alert(err?.message || 'Phone verification failed. Please try again.');
      }
    }
  };

  const handlePhoneCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!smsCode || !confirmationResult) {
      alert('Please enter SMS code');
      return;
    }

    try {
      await firebasePhoneConfirm(confirmationResult, smsCode, phoneNumber, phoneNumber);
      router.push('/');
    } catch (err) {
      console.error('Code verification failed:', err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await firebaseLoginGoogle();
      router.push('/');
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await firebaseLoginFacebook();
      router.push('/');
    } catch (err) {
      console.error('Facebook login failed:', err);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await firebaseLoginApple();
      router.push('/');
    } catch (err) {
      console.error('Apple login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        {/* Login Method Tabs */}
        <div className="flex gap-1 border-b border-gray-300 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('email-nickname');
              setPhoneStep('phone');
              setSmsCode('');
              setPhoneNumber('');
            }}
            className={`flex-1 min-w-fit py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              loginMethod === 'email-nickname'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Email / Nickname
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('phone-password');
              setPhoneStep('phone');
              setSmsCode('');
              setPassword('');
            }}
            className={`flex-1 min-w-fit py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              loginMethod === 'phone-password'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Phone + Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('phone-sms');
              setPhoneStep('phone');
              setSmsCode('');
              setEmailOrNickname('');
              setPassword('');
            }}
            className={`flex-1 min-w-fit py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              loginMethod === 'phone-sms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Phone + SMS
          </button>
        </div>

        {/* Email or Nickname / Password Form */}
        {loginMethod === 'email-nickname' && (
        <form className="mt-8 space-y-6" onSubmit={handleEmailOrNicknameLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Email or Nickname Input */}
            <div>
              <label htmlFor="emailOrNickname" className="sr-only">
                Email or Nickname
              </label>
              <input
                id="emailOrNickname"
                name="emailOrNickname"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address or nickname"
                value={emailOrNickname}
                onChange={(e) => setEmailOrNickname(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        )}

        {/* Phone + Password Login Form */}
        {loginMethod === 'phone-password' && (
        <form className="mt-8 space-y-6" onSubmit={handlePhonePasswordLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Phone Number Input */}
            <div>
              <label htmlFor="phoneNumberPassword" className="sr-only">
                Phone Number
              </label>
              <input
                id="phoneNumberPassword"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +1 for USA)</p>
            </div>

            {/* Password Input */}
            <div className="relative">
              <label htmlFor="phonePasswordInput" className="sr-only">
                Password
              </label>
              <input
                id="phonePasswordInput"
                name="phonePassword"
                type={showPhonePassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={phonePassword}
                onChange={(e) => setPhonePassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPhonePassword(!showPhonePassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPhonePassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          {/* Forgot Password Link - Phone + Password */}
          <div className="text-center mt-4">
            <Link href="/firebase-phone-reset-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Forgot password?
            </Link>
          </div>
        </form>
        )}

        {/* Phone + SMS Login Form */}
        {loginMethod === 'phone-sms' && (
          <>
            {/* Phone Number Step */}
            {phoneStep === 'phone' && (
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
            {phoneStep === 'verify' && (
              <form className="mt-8 space-y-6" onSubmit={handlePhoneCodeSubmit}>
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
                    setPhoneStep('phone');
                    setSmsCode('');
                  }}
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use different phone number
                </button>
              </form>
            )}
          </>
        )}

        {/* Divider and Social Login - only show for email/nickname method */}
        {loginMethod === 'email-nickname' && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">🔷</span>
                <span className="ml-2">Google</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={handleFacebookLogin}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">📘</span>
                <span className="ml-2">Facebook</span>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">🍎</span>
                <span className="ml-2">Apple</span>
              </button>

              {/* Phone */}
              <Link
                href="/firebase-phone-login"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="text-xl">📱</span>
                <span className="ml-2">Phone</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
