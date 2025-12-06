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
      setLoginError('Email/Số điện thoại và mật khẩu là bắt buộc');
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
          setLoginError('Không tìm thấy tài khoản với số điện thoại này. Vui lòng đăng ký trước.');
        } else if (err?.code === 'auth/wrong-password' || err?.message?.includes('incorrect')) {
          setLoginError('Mật khẩu không đúng. Vui lòng thử lại.');
        } else if (err?.message?.includes('user-not-found') || err?.message?.includes('not found')) {
          setLoginError('Không tìm thấy tài khoản với số điện thoại này. Vui lòng đăng ký trước.');
        } else {
          setLoginError(err?.message || 'Đăng nhập bằng số điện thoại thất bại. Vui lòng thử lại.');
        }
      } else {
        setLoginError('Đăng nhập thất bại. Vui lòng thử lại.');
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
            Đăng nhập tài khoản
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Người dùng mới?{' '}
            <Link href="/firebase-signup" className="font-medium text-blue-600 hover:text-blue-500">
              Tạo tài khoản
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
                Email hoặc Số điện thoại
              </label>
              <input
                id="emailOrPhone"
                name="emailOrPhone"
                type="text"
                autoComplete="off"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Địa chỉ email hoặc số điện thoại"
                value={emailOrPhone}
                onChange={(e) => detectInputType(e.target.value)}
                disabled={isLoading}
              />
              {emailOrPhone && (
                <div className="text-xs text-gray-500 px-3 pt-1">
                  {isPhoneLogin ? '📱 Đăng nhập bằng SĐT' : '✉️ Đăng nhập bằng Email'}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Mật khẩu"
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
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
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
              title="Đăng nhập bằng Google"
            >
              <span className="text-xl">🔷</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-grey-200 text-sm font-medium text-gray-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Đăng nhập bằng Facebook"
            >
              <span className="text-xl">📘</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-grey-200 text-sm font-medium text-gray-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Đăng nhập bằng Apple"
            >
              <span className="text-xl">🍎</span>
            </button>
          </div>

          {/* Phone Login with SMS Button */}
          <Link
            href="/firebase-phone-login"
            className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-grey-200 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
            title="Đăng ký bằng số điện thoại và mã SMS"
          >
            <span className="text-xl mr-2">📱</span>
            <span>Đăng ký bằng số điện thoại (SMS)</span>
          </Link>
        </div>

        {/* Traditional Login Link */}
        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sử dụng đăng nhập truyền thống
          </Link>
        </p>
      </div>
    </div>
  );
}
