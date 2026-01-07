'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRecaptchaVerifier } from '@/hooks/useRecaptchaVerifier';
import { validateFirebasePhoneNumber } from '@/lib/api';

export default function FirebasePhoneLoginPage() {
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const { firebasePhoneVerify, firebasePhoneConfirm, isLoading, error } = useAuth();
  const router = useRouter();

  // Use the custom reCAPTCHA verifier hook
  const {
    recaptchaVerifier,
    isReady: isRecaptchaReady,
    error: recaptchaError,
    reset: resetRecaptcha,
  } = useRecaptchaVerifier({
    containerId: 'recaptcha-container',
    size: 'invisible',
    onSuccess: (token) => {
      console.log('[Firebase Phone Login] reCAPTCHA verified');
    },
    onExpired: () => {
      console.log('[Firebase Phone Login] reCAPTCHA expired, resetting...');
      setLocalError('Phiên xác thực đã hết hạn. Vui lòng thử lại.');
    },
    onError: (err) => {
      console.error('[Firebase Phone Login] reCAPTCHA error:', err);
      setLocalError('Lỗi xác thực reCAPTCHA. Vui lòng tải lại trang.');
    },
  });

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!phoneNumber) {
      setLocalError('Vui lòng nhập số điện thoại');
      return;
    }

    // Validate and normalize phone number (auto-adds +84 prefix)
    const validation = validateFirebasePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setLocalError(validation.error || 'Số điện thoại không hợp lệ');
      return;
    }

    if (!recaptchaVerifier || !isRecaptchaReady) {
      setLocalError('reCAPTCHA đang khởi tạo. Vui lòng đợi một chút và thử lại.');
      return;
    }

    try {
      console.log(`[Firebase Phone Login] Verifying phone: ${phoneNumber} → ${validation.normalized}`);
      // Use the normalized phone number with +84 prefix
      const result = await firebasePhoneVerify(validation.normalized!, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('verify');
      setLocalError(null);
    } catch (err: any) {
      console.error('Phone verification failed:', err);

      // Reset reCAPTCHA for retry
      resetRecaptcha();

      // Handle specific Firebase errors
      if (err?.code === 'auth/captcha-check-failed') {
        setLocalError('Xác thực reCAPTCHA thất bại. Vui lòng đảm bảo tên miền của bạn được ủy quyền trong Firebase Console.');
      } else if (err?.code === 'auth/invalid-phone-number') {
        setLocalError('Số điện thoại không hợp lệ. Yêu cầu 10 chữ số (ví dụ: 0867631313).');
      } else if (err?.code === 'auth/too-many-requests') {
        setLocalError('Quá nhiều yêu cầu. Vui lòng đợi vài phút và thử lại.');
      } else if (err?.code === 'auth/quota-exceeded') {
        setLocalError('Đã vượt quá giới hạn SMS. Vui lòng thử lại sau.');
      } else if (err?.message?.includes('-39') || err?.code?.includes('-39')) {
        setLocalError('Lỗi xác thực Firebase. Vui lòng kiểm tra cấu hình Phone Authentication trong Firebase Console.');
      } else {
        setLocalError(err?.message || 'Xác thực số điện thoại thất bại. Vui lòng thử lại.');
      }
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!smsCode || !confirmationResult) {
      setLocalError('Vui lòng nhập mã SMS');
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

      if (err?.code === 'auth/invalid-verification-code') {
        setLocalError('Mã xác thực không đúng. Vui lòng kiểm tra lại.');
      } else if (err?.code === 'auth/code-expired') {
        setLocalError('Mã xác thực đã hết hạn. Vui lòng gửi lại mã mới.');
      } else {
        setLocalError(err?.message || 'Xác thực thất bại. Vui lòng thử lại.');
      }
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
        {(error || localError || recaptchaError) && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="text-sm font-medium text-red-800">
              {localError || error || recaptchaError}
            </div>
          </div>
        )}

        {/* reCAPTCHA Status (for debugging) */}
        {!isRecaptchaReady && step === 'phone' && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
            <div className="text-sm text-yellow-700 flex items-center">
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang khởi tạo reCAPTCHA...
            </div>
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
              disabled={isLoading || !isRecaptchaReady}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang gửi mã...' : !isRecaptchaReady ? 'Đang khởi tạo...' : 'Gửi mã xác thực'}
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
