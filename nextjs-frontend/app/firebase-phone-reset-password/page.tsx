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
    if (!pwd) return 'Mật khẩu là bắt buộc';
    if (pwd.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    if (!/[A-Z]/.test(pwd)) return 'Mật khẩu phải chứa ít nhất một chữ hoa';
    if (!/[a-z]/.test(pwd)) return 'Mật khẩu phải chứa ít nhất một chữ thường';
    if (!/[0-9]/.test(pwd)) return 'Mật khẩu phải chứa ít nhất một số';
    return '';
  };

  // Step 1: Send SMS Code
  const handlePhoneSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!phoneNumber) {
      setErrorMessage('Số điện thoại là bắt buộc');
      return;
    }

    // Validate and normalize phone number (auto-adds +84 prefix)
    const validation = validateFirebasePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Số điện thoại không hợp lệ');
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
        setErrorMessage('Không tìm thấy số điện thoại. Vui lòng kiểm tra và thử lại.');
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
          setErrorMessage(smsError?.message || 'Gửi SMS thất bại. Vui lòng thử lại.');
          setRecaptchaVerifier(null);
        }
      }
    } catch (err: any) {
      console.error('[Reset Password] Phone sign in error:', err);
      setErrorMessage(err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify SMS Code
  const handleSmsVerification = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!smsCode) {
      setErrorMessage('Mã SMS là bắt buộc');
      return;
    }

    if (!confirmationResult) {
      setErrorMessage('Xác thực SMS chưa được khởi tạo. Vui lòng thử lại.');
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
      setErrorMessage(err?.message || 'Mã SMS không hợp lệ. Vui lòng thử lại.');
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
      setErrorMessage('Mật khẩu mới không khớp');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Reset Password] Starting password reset process...');

      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.log('[Reset Password] User not authenticated. Please start over.');
        setErrorMessage('Phiên xác thực đã mất. Vui lòng bắt đầu lại quy trình đặt lại.');
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
        setErrorMessage('Không thể cập nhật mật khẩu trên hệ thống. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('[Reset Password] Password reset error:', err);

      let errorMsg = 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.';

      if (err.code === 'auth/weak-password') {
        errorMsg = 'Mật khẩu quá yếu. Vui lòng sử dụng mật khẩu mạnh hơn.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đặt lại mật khẩu
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Đặt lại mật khẩu xác thực điện thoại của bạn
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-md bg-grey-200 p-4">
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

            <button
              type="submit"
              disabled={isLoading || !phoneNumber}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang gửi SMS...' : 'Gửi mã xác thực'}
            </button>
          </form>
        )}

        {/* Step 2: SMS Code Verification */}
        {step === 'verify' && (
          <form className="mt-8 space-y-6" onSubmit={handleSmsVerification}>
            <div className="rounded-md bg-grey-200 p-4">
              <div className="text-sm text-blue-800">
                <p className="font-medium">Điện thoại: {phoneNumber}</p>
                <p className="text-xs mt-1">Email: {userEmail}</p>
                <p className="text-xs mt-2">Kiểm tra SMS để nhận mã xác thực</p>
              </div>
            </div>

            <div>
              <label htmlFor="smsCode" className="block text-sm font-medium text-gray-700">
                Mã xác thực
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
              <p className="mt-1 text-xs text-gray-500">Nhập mã 6 chữ số được gửi đến điện thoại của bạn</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || smsCode.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang xác thực...' : 'Xác thực mã'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setPhoneNumber('');
                setSmsCode('');
                setConfirmationResult(null);
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-grey-200 hover:bg-white"
            >
              Quay lại
            </button>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset' && (
          <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
            <div className="rounded-md bg-grey-200 p-4">
              <div className="text-sm text-green-800">
                <p className="font-medium">✓ Điện thoại đã xác thực</p>
                <p className="font-medium">✓ SMS đã xác thực</p>
                <p className="text-xs mt-1">Bây giờ hãy nhập mật khẩu mới của bạn</p>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-gray-600 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Phải chứa chữ hoa, chữ thường, số và ít nhất 6 ký tự
              </p>
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-600 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="rounded-md bg-white p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Yêu cầu mật khẩu:</p>
                <div className="space-y-1 text-sm">
                  <p className={newPassword.length >= 6 ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Ít nhất 6 ký tự
                  </p>
                  <p className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Chữ hoa
                  </p>
                  <p className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Chữ thường
                  </p>
                  <p className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Số
                  </p>
                  <p className={newPassword === confirmNewPassword && confirmNewPassword ? 'text-green-600' : 'text-gray-500'}>
                    ✓ Mật khẩu khớp
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !newPassword || newPassword !== confirmNewPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang đặt lại mật khẩu...' : 'Đặt lại mật khẩu'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('verify');
                setNewPassword('');
                setConfirmNewPassword('');
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-grey-200 hover:bg-white"
            >
              Quay lại
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
