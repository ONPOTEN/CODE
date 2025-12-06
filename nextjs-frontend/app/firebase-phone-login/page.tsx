'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { validateFirebasePhoneNumber } from '@/lib/api';

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
      alert('Vui lòng nhập số điện thoại');
      return;
    }

    // Validate and normalize phone number (auto-adds +84 prefix)
    const validation = validateFirebasePhoneNumber(phoneNumber);
    if (!validation.valid) {
      alert(validation.error || 'Số điện thoại không hợp lệ');
      return;
    }

    if (!recaptchaVerifier) {
      alert('reCAPTCHA đang khởi tạo. Vui lòng đợi một chút và thử lại.');
      return;
    }

    try {
      console.log(`[Firebase Phone Login] Verifying phone: ${phoneNumber} → ${validation.normalized}`);
      // Use the normalized phone number with +84 prefix
      const result = await firebasePhoneVerify(validation.normalized!, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('verify');
    } catch (err: any) {
      console.error('Phone verification failed:', err);
      // Handle specific Firebase errors
      if (err?.code === 'auth/captcha-check-failed') {
        alert('Xác thực reCAPTCHA thất bại. Vui lòng đảm bảo tên miền của bạn được ủy quyền trong Firebase Console. Hãy chắc chắn tên miền (ví dụ: localhost, yourdomain.com) đã được thêm vào Firebase Authentication > Settings > Authorized Domains.');
      } else if (err?.code === 'auth/invalid-phone-number') {
        alert('Số điện thoại không hợp lệ. Yêu cầu 10 chữ số (ví dụ: 0867631313 hoặc 867631313). Tiền tố +84 sẽ được thêm tự động.');
      } else {
        alert(err?.message || 'Xác thực số điện thoại thất bại. Vui lòng thử lại.');
      }
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!smsCode || !confirmationResult) {
      alert('Vui lòng nhập mã SMS');
      return;
    }

    try {
      console.log('[Firebase Phone Login] Confirming phone code...');
      await firebasePhoneConfirm(confirmationResult, smsCode, phoneNumber);

      console.log('[Firebase Phone Login] SMS verification complete');
      console.log('[Firebase Phone Login] Redirecting to password setup...');

      // Always redirect to password setup after phone login
      const params = new URLSearchParams({
        phone: phoneNumber,
      });
      router.push(`/firebase-phone-password-setup?${params.toString()}`);
    } catch (err: any) {
      console.error('[Firebase Phone Login] Code verification failed:', err);
      alert(err?.message || 'Xác thực thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập bằng số điện thoại
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Quay lại{' '}
            <Link href="/firebase-login" className="font-medium text-blue-600 hover:text-blue-500">
              đăng nhập
            </Link>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-grey-200 p-4">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        {/* Phone Number Step */}
        {step === 'phone' && (
          <form className="mt-8 space-y-6" onSubmit={handlePhoneSubmit}>
            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Số điện thoại
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
              <p className="mt-1 text-xs text-gray-500">Bao gồm mã quốc gia (ví dụ: +84 cho Việt Nam)</p>
            </div>

            {/* reCAPTCHA Container */}
            <div id="recaptcha-container" />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
            </button>
          </form>
        )}

        {/* SMS Code Verification Step */}
        {step === 'verify' && (
          <form className="mt-8 space-y-6" onSubmit={handleCodeSubmit}>
            {/* Info Box */}
            <div className="rounded-md bg-grey-200 p-4">
              <div className="flex">
                <div className="text-sm font-medium text-blue-800">
                  Đã gửi mã xác thực đến {phoneNumber}
                </div>
              </div>
            </div>

            {/* SMS Code */}
            <div>
              <label htmlFor="smsCode" className="block text-sm font-medium text-gray-700">
                Mã xác thực
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
              <p className="mt-1 text-xs text-gray-500">Nhập mã 6 chữ số từ tin nhắn SMS của bạn</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang xác thực...' : 'Xác thực và đăng nhập'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setSmsCode('');
              }}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-grey-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sử dụng số điện thoại khác
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
