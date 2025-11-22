'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { apiRequest, tokenStorage } from '@/lib/api';

export default function FirebaseLoginPage() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isPhoneLogin, setIsPhoneLogin] = useState(false);
  const { firebaseLoginEmail, firebaseLoginPhonePassword, firebaseLoginGoogle, firebaseLoginFacebook, firebaseLoginApple, isLoading, error } = useAuth();
  const router = useRouter();

  // Detect if input is email or phone
  const detectInputType = (value: string) => {
    const isEmail = value.includes('@');
    setIsPhoneLogin(!isEmail);
    setEmailOrPhone(value);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!emailOrPhone || !password) {
      setLoginError('Email/Phone and password are required');
      return;
    }

    try {
      if (isPhoneLogin) {
        // Handle phone + password login through proper Firebase authentication
        console.log('[Login] Attempting phone + password login for:', emailOrPhone);

        await firebaseLoginPhonePassword(emailOrPhone, password);
        router.push('/');
      } else {
        // Handle email login
        await firebaseLoginEmail(emailOrPhone, password);
        router.push('/');
      }
    } catch (err: any) {
      console.error('Login failed:', err);

      // Provide specific error message for phone login failures
      if (isPhoneLogin) {
        if (err?.code === 'auth/user-not-found') {
          setLoginError('No account found with this phone number. Please sign up first.');
        } else if (err?.code === 'auth/wrong-password' || err?.message?.includes('incorrect')) {
          setLoginError('Incorrect password. Please try again.');
        } else if (err?.message?.includes('user-not-found') || err?.message?.includes('not found')) {
          setLoginError('No account found with this phone number. Please sign up first.');
        } else {
          setLoginError(err?.message || 'Phone login failed. Please try again.');
        }
      } else {
        setLoginError('Login failed. Please try again.');
      }
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
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            New user?{' '}
            <Link href="/firebase-signup" className="font-medium text-blue-600 hover:text-blue-500">
              Create account
            </Link>
          </p>
        </div>

        {/* Error Message */}
        {(error || loginError) && (
          <div className="rounded-md bg-grey-200 p-4">
            <div className="text-sm font-medium text-red-800">{error || loginError}</div>
          </div>
        )}

        {/* Unified Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Email or Phone Input */}
            <div>
              <label htmlFor="emailOrPhone" className="sr-only">
                Email or Phone
              </label>
              <input
                id="emailOrPhone"
                name="emailOrPhone"
                type="text"
                autoComplete="off"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address or phone number"
                value={emailOrPhone}
                onChange={(e) => detectInputType(e.target.value)}
                disabled={isLoading}
              />
              {emailOrPhone && (
                <div className="text-xs text-gray-500 px-3 pt-1">
                  {isPhoneLogin ? '📱 Phone login' : '✉️ Email login'}
                </div>
              )}
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
                className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-600"
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
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Social Login Buttons and Phone SMS */}
        <div className="space-y-3">
          {/* Social Providers Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-grey-200 text-sm font-medium text-gray-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sign in with Google"
            >
              <span className="text-xl">🔷</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-grey-200 text-sm font-medium text-gray-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sign in with Facebook"
            >
              <span className="text-xl">📘</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-grey-200 text-sm font-medium text-gray-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sign in with Apple"
            >
              <span className="text-xl">🍎</span>
            </button>
          </div>

          {/* Phone Login with SMS Button */}
          <Link
            href="/firebase-phone-login"
            className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-grey-200 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
            title="Register with phone and SMS code"
          >
            <span className="text-xl mr-2">📱</span>
            <span>Register with phone (SMS)</span>
          </Link>
        </div>

        {/* Traditional Login Link */}
        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Use traditional login
          </Link>
        </p>
      </div>
    </div>
  );
}
