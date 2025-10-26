'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [emailOrNickname, setEmailOrNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { firebaseLoginEmail, firebaseLoginNickname, firebaseLoginPhonePassword, firebaseLoginGoogle, firebaseLoginFacebook, firebaseLoginApple, isLoading, error } = useAuth();
  const router = useRouter();

  const handleCombinedLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!emailOrNickname && !phoneNumber) {
      alert('Please enter email, nickname, or phone number');
      return;
    }

    if (!password) {
      alert('Please enter password');
      return;
    }

    try {
      if (phoneNumber) {
        // Phone + Password login
        await firebaseLoginPhonePassword(phoneNumber, password);
      } else {
        // Email or Nickname login
        const isEmail = emailOrNickname.includes('@');
        if (isEmail) {
          await firebaseLoginEmail(emailOrNickname, password);
        } else {
          await firebaseLoginNickname(emailOrNickname, password);
        }
      }
      router.push('/');
    } catch (err) {
      console.error('Login failed:', err);
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

        {/* Combined Email / Nickname / Phone + Password Form */}
        <form className="mt-8 space-y-6" onSubmit={handleCombinedLogin}>
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address, nickname, or phone number"
                value={emailOrNickname || phoneNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if value looks like a phone number
                  const isPhoneNumber = value.startsWith('+') || /^[0-9]/.test(value);
                  if (isPhoneNumber) {
                    setPhoneNumber(value);
                    setEmailOrNickname('');
                  } else {
                    setEmailOrNickname(value);
                    setPhoneNumber('');
                  }
                }}
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

          {/* Helper text */}
          <p className="text-xs text-gray-500 text-center">
            Enter email, nickname, or phone (with country code like +1)
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          {/* Forgot Password Link */}
          <div className="text-center mt-4">
            <Link href="/firebase-phone-reset-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Forgot password?
            </Link>
          </div>
        </form>

        {/* Divider and Social Login */}
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
      </div>
    </div>
  );
}
