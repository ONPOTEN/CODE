'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// Facebook App credentials
const FACEBOOK_APP_ID = '1122464965761712';

export default function LoginPage() {
  const [username, setUsername] = useState(''); // email, username, or phone
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isPhoneInput, setIsPhoneInput] = useState(false);

  const { login, firebaseLoginPhonePassword, googleLogin, facebookLogin, isLoading, error } = useAuth();
  const router = useRouter();

  // Initialize Facebook SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).FB) {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        (window as any).FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        console.log('[Login] Facebook SDK initialized');
      };
      document.body.appendChild(script);
    }
  }, []);

  // Initialize Google Identity Services SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).google?.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('[Login] Google Identity Services SDK initialized');
      };
      document.body.appendChild(script);
    }
  }, []);

  // Detect if input looks like a phone number
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setLoginError('');

    // Check if input looks like a phone number
    const cleanedInput = value.trim().replace(/\s/g, '');
    const looksLikePhone = /^(\+?\d{9,15}|0\d{9,10})$/.test(cleanedInput);
    setIsPhoneInput(looksLikePhone && !value.includes('@'));
  };

  // Normalize phone number to international format
  const normalizePhoneNumber = (phone: string): string => {
    let cleaned = phone.trim().replace(/\s/g, '');

    // If starts with 0, replace with +84 (Vietnam)
    if (cleaned.startsWith('0')) {
      cleaned = '+84' + cleaned.substring(1);
    }
    // If doesn't start with +, add +
    else if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!username) {
      setLoginError('Vui lòng nhập email hoặc số điện thoại');
      return;
    }

    if (!password) {
      setLoginError('Vui lòng nhập mật khẩu');
      return;
    }

    try {
      const cleanedInput = username.trim();

      if (isPhoneInput) {
        // Phone + Password login via Firebase
        const phoneNumber = normalizePhoneNumber(cleanedInput);
        console.log('[Login] Phone login:', cleanedInput, '→', phoneNumber);
        await firebaseLoginPhonePassword(phoneNumber, password);
      } else {
        // Email or username login via Laravel backend
        console.log('[Login] Email/username login:', cleanedInput);
        await login(cleanedInput, password);
      }
      router.push('/');
    } catch (err: any) {
      console.error('Login failed:', err);

      // Provide specific error messages
      if (isPhoneInput) {
        if (err?.message?.includes('not found') || err?.code === 'auth/user-not-found') {
          setLoginError('Không tìm thấy tài khoản với số điện thoại này. Vui lòng đăng ký trước.');
        } else if (err?.message?.includes('password') || err?.message?.includes('credentials')) {
          setLoginError('Mật khẩu không đúng. Vui lòng thử lại.');
        } else {
          setLoginError(err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
      } else {
        if (err?.message?.includes('credentials') || err?.message?.includes('password')) {
          setLoginError('Email/tên đăng nhập hoặc mật khẩu không đúng.');
        } else {
          setLoginError(err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      router.push('/');
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await facebookLogin();
      router.push('/');
    } catch (err) {
      console.error('Facebook login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4">
        {/* Error Message */}
        {(error || loginError) && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="text-sm font-medium text-red-800">{loginError || error}</div>
          </div>
        )}

        {/* Social Login Buttons - Stacked vertically */}
        <div className="space-y-3">
          {/* Phone Login Button - Link to SMS verification page */}
          <Link
            href="/firebase-phone-login"
            className="w-full flex items-center py-3 px-4 rounded-md text-white font-semibold text-lg"
            style={{ backgroundColor: '#25D366' }}
          >
            <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            <span>Đăng ký bằng số điện thoại (SMS)</span>
          </Link>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center py-3 px-4 rounded-md text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3b5998' }}
          >
            <div className="w-8 h-8 mr-3 bg-white rounded flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <span>Tiếp tục với Gmail</span>
          </button>

          {/* Facebook Login Button */}
          <button
            type="button"
            onClick={handleFacebookLogin}
            disabled={isLoading}
            className="w-full flex items-center py-3 px-4 rounded-md text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3b5998' }}
          >
            <div className="w-8 h-8 mr-3 bg-[#1877F2] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <span>Tiếp tục với Facebook</span>
          </button>
        </div>

        {/* Email / Phone + Password Form */}
        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          {/* Email / Phone Input */}
          <div>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="w-full px-4 py-3 border-2 border-gray-800 rounded-md text-gray-900 text-lg placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="email hoặc phone"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              disabled={isLoading}
            />
            {/* Show phone detection hint */}
            {username && (
              <p className="mt-1 text-xs text-gray-500">
                {isPhoneInput ? '📱 Đăng nhập bằng số điện thoại' : '✉️ Đăng nhập bằng email/tên đăng nhập'}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full px-4 py-3 border-2 border-gray-800 rounded-md text-gray-900 text-lg placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-md text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3b5998' }}
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          {/* Forgot Password & Register Links */}
          <div className="flex justify-between text-sm mt-4">
            <Link href="/firebase-phone-reset-password" className="text-blue-600 hover:text-blue-500">
              Quên mật khẩu?
            </Link>
            <Link href="/register" className="text-blue-600 hover:text-blue-500">
              Đăng ký tài khoản
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
