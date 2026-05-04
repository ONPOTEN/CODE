import {
  User as FirebaseUser,
  AuthError,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth, auth } from './firebase';
import { apiRequest, tokenStorage, encodePhoneNumber, normalizePhoneNumber, getUserByPhone } from './api';

export interface FirebaseAuthResponse {
  success: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    display_name: string;
    role?: string;
  };
  token: string;
  message?: string;
  error?: string;
}

/**
 * Firebase Authentication Service
 * Handles Firebase auth with multiple providers and Laravel backend integration
 */
export const firebaseAuthService = {
  /**
   * Register with email and password
   */
  registerWithEmail: async (
    email: string,
    password: string,
    displayName: string,
    nickname?: string,
    username?: string
  ): Promise<FirebaseAuthResponse> => {
    try {
      console.log(`[FirebaseAuthService] Registering user: ${email}`);

      // Create Firebase user
      const userCredential = await firebaseAuth.register(email, password);
      const firebaseUser = userCredential.user;

      // Update display name in Firebase
      await updateProfile(firebaseUser, {
        displayName: displayName,
      });

      // Get Firebase ID token
      const idToken = await firebaseAuth.getIdToken();

      // Register in Laravel backend
      const response = await apiRequest<FirebaseAuthResponse>('/auth/firebase-register', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: email,
          display_name: displayName,
          nickname: nickname || displayName.replace(/\s+/g, '_').toLowerCase(),
          username: username || displayName.replace(/\s+/g, '_'),
          firebase_token: idToken,
        }),
      });

      if (response.success) {
        // Save token
        tokenStorage.set(response.token);
        console.log(`[FirebaseAuthService] Registration successful for: ${email}`);
        return response;
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('[FirebaseAuthService] Registration error:', error);
      throw {
        success: false,
        message: error.message || 'Registration failed',
        error: error.code,
      };
    }
  },

  /**
   * Login with email and password
   */
  loginWithEmail: async (email: string, password: string): Promise<FirebaseAuthResponse> => {
    try {
      console.log(`[FirebaseAuthService] Login attempt: ${email}`);

      // Sign in with Firebase
      const userCredential = await firebaseAuth.login(email, password);
      const firebaseUser = userCredential.user;

      // Get Firebase ID token
      const idToken = await firebaseAuth.getIdToken();

      // Authenticate with Laravel backend
      const response = await apiRequest<FirebaseAuthResponse>('/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          display_name: firebaseUser.displayName || email,
          auth_method: 'email',
          firebase_token: idToken,
        }),
      });

      if (response.success) {
        // Save token
        tokenStorage.set(response.token);
        console.log(`[FirebaseAuthService] Login successful: ${email}`);
        return response;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('[FirebaseAuthService] Login error:', error);
      throw {
        success: false,
        message: error.message || 'Login failed',
        error: error.code,
      };
    }
  },

  /**
   * Login with nickname and password
   */
  loginWithNickname: async (nickname: string, password: string): Promise<FirebaseAuthResponse> => {
    try {
      console.log(`[FirebaseAuthService] Login attempt with nickname: ${nickname}`);

      // First, fetch user data from Laravel to get email
      const userResponse = await apiRequest<any>('/users/by-nickname/' + nickname, {
        method: 'GET',
      });

      if (!userResponse || !userResponse.user_email) {
        throw new Error('User not found');
      }

      const email = userResponse.user_email;

      // Sign in with Firebase using the email
      const userCredential = await firebaseAuth.login(email, password);
      const firebaseUser = userCredential.user;

      // Get Firebase ID token
      const idToken = await firebaseAuth.getIdToken();

      // Authenticate with Laravel backend
      const response = await apiRequest<FirebaseAuthResponse>('/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          display_name: firebaseUser.displayName || email,
          auth_method: 'email',
          nickname: nickname,
          firebase_token: idToken,
        }),
      });

      if (response.success) {
        // Save token
        tokenStorage.set(response.token);
        console.log(`[FirebaseAuthService] Login successful with nickname: ${nickname}`);
        return response;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('[FirebaseAuthService] Nickname login error:', error);
      throw {
        success: false,
        message: error.message || 'Login failed',
        error: error.code,
      };
    }
  },

  /**
   * Login with phone number and password
   */
  loginWithPhonePassword: async (phoneNumber: string, password: string): Promise<FirebaseAuthResponse> => {
    try {
      // Normalize phone number
      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      console.log(`[FirebaseAuthService] Login attempt with phone: ${normalizedPhone}`);

      // Step 1: Query Laravel to get user by phone number
      // This returns user_login, email, and other user data
      console.log(`[FirebaseAuthService] Looking up user by phone in Laravel...`);
      const userResponse = await getUserByPhone(normalizedPhone);

      if (!userResponse) {
        throw new Error('User with this phone number not found. Please verify your phone first.');
      }

      const username = userResponse.user_login;
      if (!username) {
        throw new Error('User account not properly configured');
      }

      console.log(`[FirebaseAuthService] Found user by phone:`, {
        username: username,
        email: userResponse.user_email,
        firebase_uid: userResponse.firebase_uid,
        phone: userResponse.phone,
      });

      // Step 2: Login with Laravel using standard login endpoint
      // Use username (user_login) + password
      console.log(`[FirebaseAuthService] Logging in with Laravel using username: ${username}`);
      console.log(`[FirebaseAuthService] Login request:`, {
        username: username,
        password_length: password.length,
      });
      let loginResponse;
      try {
        loginResponse = await apiRequest<any>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: username,
            password: password,
          }),
        });
        console.log('[FirebaseAuthService] Laravel login successful:', {
          token_received: !!loginResponse?.token,
          user_id: loginResponse?.user?.id,
        });
        console.log('[FirebaseAuthService] Full login response:', loginResponse);
      } catch (loginError: any) {
        console.error('[FirebaseAuthService] Laravel login API error:', loginError);
        console.error('[FirebaseAuthService] Error details:', {
          message: loginError.message,
          status: loginError.status,
          statusCode: loginError.statusCode,
          errors: loginError.errors,
        });
        throw new Error(`Login failed: ${loginError.message}`);
      }

      if (loginResponse && loginResponse.token) {
        console.log(`[FirebaseAuthService] Laravel login successful`);
        // Save Sanctum token
        tokenStorage.set(loginResponse.token);

        // Build response object
        const response: FirebaseAuthResponse = {
          success: true,
          token: loginResponse.token,
          user: loginResponse.user || {
            id: 0,
            username: username,
            email: userResponse.user_email || '',
            display_name: userResponse.display_name || username,
          },
          message: 'Login successful',
        };

        console.log(`[FirebaseAuthService] Phone+password login successful with user: ${username}`);
        return response;
      } else {
        console.warn('[FirebaseAuthService] Login response does not have token:', loginResponse);
        throw new Error('Login response missing token');
      }
    } catch (error: any) {
      console.error('[FirebaseAuthService] Phone password login error:', error);

      // Provide helpful error messages
      let message = error.message || 'Login failed';
      if (error.message?.includes('credentials')) {
        message = 'Incorrect phone number or password. Please try again.';
      } else if (error.message?.includes('not found')) {
        message = 'Phone number not found. Please verify your phone and set up a password first.';
      }

      throw {
        success: false,
        message: message,
        error: error.code,
      };
    }
  },

  /**
   * Sign in with Google
   */
  signInWithGoogle: async (): Promise<FirebaseAuthResponse> => {
    try {
      console.log('[FirebaseAuthService] Starting Google sign-in');

      const firebaseUser = await firebaseAuth.signInWithGoogle();

      if (!firebaseUser.email) {
        throw new Error('No email from Google account');
      }

      const idToken = await firebaseAuth.getIdToken();

      // Authenticate with Laravel backend
      const response = await apiRequest<FirebaseAuthResponse>('/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          display_name: firebaseUser.displayName || 'Google User',
          auth_method: 'google',
          firebase_token: idToken,
        }),
      });

      if (response.success) {
        tokenStorage.set(response.token);
        console.log('[FirebaseAuthService] Google sign-in successful');
        return response;
      } else {
        throw new Error(response.error || 'Google sign-in failed');
      }
    } catch (error: any) {
      console.error('[FirebaseAuthService] Google sign-in error:', error);
      throw {
        success: false,
        message: error.message || 'Google sign-in failed',
        error: error.code,
      };
    }
  },

  /**
   * Sign in with Facebook
   */
  signInWithFacebook: async (): Promise<FirebaseAuthResponse> => {
    try {
      console.log('[FirebaseAuthService] Starting Facebook sign-in');

      const firebaseUser = await firebaseAuth.signInWithFacebook();

      if (!firebaseUser.email) {
        throw new Error('No email from Facebook account');
      }

      const idToken = await firebaseAuth.getIdToken();

      // Authenticate with Laravel backend
      const response = await apiRequest<FirebaseAuthResponse>('/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          display_name: firebaseUser.displayName || 'Facebook User',
          auth_method: 'facebook',
          firebase_token: idToken,
        }),
      });

      if (response.success) {
        tokenStorage.set(response.token);
        console.log('[FirebaseAuthService] Facebook sign-in successful');
        return response;
      } else {
        throw new Error(response.error || 'Facebook sign-in failed');
      }
    } catch (error: any) {
      console.error('[FirebaseAuthService] Facebook sign-in error:', error);
      throw {
        success: false,
        message: error.message || 'Facebook sign-in failed',
        error: error.code,
      };
    }
  },

  /**
   * Sign in with Apple
   */
  signInWithApple: async (): Promise<FirebaseAuthResponse> => {
    try {
      console.log('[FirebaseAuthService] Starting Apple sign-in');

      const firebaseUser = await firebaseAuth.signInWithApple();

      if (!firebaseUser.email) {
        throw new Error('No email from Apple account');
      }

      const idToken = await firebaseAuth.getIdToken();

      // Authenticate with Laravel backend
      const response = await apiRequest<FirebaseAuthResponse>('/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          display_name: firebaseUser.displayName || 'Apple User',
          auth_method: 'apple',
          firebase_token: idToken,
        }),
      });

      if (response.success) {
        tokenStorage.set(response.token);
        console.log('[FirebaseAuthService] Apple sign-in successful');
        return response;
      } else {
        throw new Error(response.error || 'Apple sign-in failed');
      }
    } catch (error: any) {
      console.error('[FirebaseAuthService] Apple sign-in error:', error);
      throw {
        success: false,
        message: error.message || 'Apple sign-in failed',
        error: error.code,
      };
    }
  },

  /**
   * Handle phone number verification
   */
  verifyPhoneNumber: async (
    phoneNumber: string,
    recaptchaVerifier: any
  ): Promise<any> => {
    try {
      console.log(`[FirebaseAuthService] Starting phone verification: ${phoneNumber}`);

      return await firebaseAuth.signInWithPhone(phoneNumber, recaptchaVerifier);
    } catch (error: any) {
      console.error('[FirebaseAuthService] Phone verification error:', error);
      console.error('[FirebaseAuthService] Error details:', {
        code: error.code,
        message: error.message,
        name: error.name,
      });

      // Handle error -39 specifically (reCAPTCHA backend verification failed)
      if (error.message?.includes('-39') || error.code?.includes('-39')) {
        const customError = new Error(
          'Firebase phone authentication is not properly configured. ' +
          'Please check: 1) Phone auth is enabled in Firebase Console, ' +
          '2) Your domain is added to Authorized Domains, ' +
          '3) You are on the Blaze plan for production SMS.'
        );
        (customError as any).code = 'auth/configuration-error';
        throw customError;
      }

      throw error;
    }
  },

  /**
   * Confirm phone verification code
   */
  confirmPhoneCode: async (
    confirmationResult: any,
    code: string,
    phoneNumber: string
  ): Promise<FirebaseAuthResponse> => {
    try {
      // Normalize phone number to ensure '+' prefix
      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      console.log('[FirebaseAuthService] Confirming phone code');
      console.log(`[FirebaseAuthService] Original phone: ${phoneNumber}`);
      console.log(`[FirebaseAuthService] Normalized phone: ${normalizedPhone}`);

      const userCredential = await confirmationResult.confirm(code);
      const firebaseUser = userCredential.user;

      console.log(`[FirebaseAuthService] Firebase user authenticated: ${firebaseUser.uid}`);

      const idToken = await firebaseAuth.getIdToken();

      // Generate email if not provided
      const userEmail = firebaseUser.email || `phone_${firebaseUser.uid}@firebase.local`;

      console.log(`[FirebaseAuthService] Syncing to Laravel backend...`);
      console.log(`  - Firebase UID: ${firebaseUser.uid}`);
      console.log(`  - Email: ${userEmail}`);
      console.log(`  - Phone: ${normalizedPhone}`);

      // Authenticate with Laravel backend
      const response = await apiRequest<FirebaseAuthResponse>('/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: userEmail,
          phone_number: normalizedPhone,
          auth_method: 'phone',
          firebase_token: idToken,
        }),
      });

      if (response.success) {
        console.log('[FirebaseAuthService] Laravel authentication successful');

        // Save JWT token (Sanctum token)
        tokenStorage.set(response.token);
        console.log('[FirebaseAuthService] Sanctum token saved');

        // Store phone auth data for future logins
        const phoneAuthData = {
          phoneNumber: normalizedPhone,
          firebaseUid: firebaseUser.uid,
          email: userEmail,
          lastLogin: new Date().toISOString(),
        };
        localStorage.setItem('phoneAuthData', JSON.stringify(phoneAuthData));
        console.log('[FirebaseAuthService] Phone auth data saved to localStorage');

        console.log('[FirebaseAuthService] Phone verification and sync complete');
        console.log('[FirebaseAuthService] User data returned:', {
          id: response.user?.id,
          username: response.user?.username,
          email: response.user?.email,
        });

        return response;
      } else {
        console.error('[FirebaseAuthService] Laravel authentication failed:', response.error);
        throw new Error(response.error || 'Phone verification failed');
      }
    } catch (error: any) {
      console.error('[FirebaseAuthService] Phone code confirmation error:', error);
      throw {
        success: false,
        message: error.message || 'Phone verification failed',
        error: error.code,
      };
    }
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    try {
      console.log('[FirebaseAuthService] Logging out');
      await firebaseAuth.logout();
      tokenStorage.remove();
      console.log('[FirebaseAuthService] Logout successful');
    } catch (error: any) {
      console.error('[FirebaseAuthService] Logout error:', error);
      // Clear token anyway
      tokenStorage.remove();
    }
  },

  /**
   * Get current Firebase user
   */
  getCurrentUser: (): FirebaseUser | null => {
    return firebaseAuth.getCurrentUser();
  },

  /**
   * Get Firebase ID token
   */
  getIdToken: async (): Promise<string | null> => {
    return firebaseAuth.getIdToken();
  },

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    return firebaseAuth.onAuthStateChanged(callback);
  },

  /**
   * Friendly error message
   */
  getErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error;

    const errorCode = error?.code || error?.message || '';
    const errorMessage = error?.message || '';

    // Check for error -39 (Firebase backend reCAPTCHA verification failed)
    if (errorMessage.includes('-39') || errorCode.includes('-39')) {
      return 'Firebase phone authentication configuration error. Please check Firebase Console settings.';
    }

    switch (errorCode) {
      case 'auth/user-not-found':
        return 'User not found';
      case 'auth/wrong-password':
        return 'Wrong password';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'User account has been disabled';
      case 'auth/email-already-in-use':
        return 'Email already in use';
      case 'auth/weak-password':
        return 'Password is too weak (minimum 6 characters)';
      case 'auth/operation-not-allowed':
        return 'Phone authentication is not enabled. Please enable it in Firebase Console.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked. Please allow popups.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email';
      case 'auth/invalid-verification-code':
        return 'Invalid verification code';
      case 'auth/invalid-phone-number':
        return 'Invalid phone number';
      case 'auth/missing-phone-number':
        return 'Phone number is required';
      case 'auth/captcha-check-failed':
        return 'reCAPTCHA verification failed. Please ensure your domain is authorized in Firebase Console.';
      case 'auth/quota-exceeded':
        return 'SMS quota exceeded. Please upgrade to Blaze plan or try again later.';
      case 'auth/configuration-error':
        return 'Firebase phone authentication is not properly configured.';
      case 'auth/code-expired':
        return 'Verification code has expired. Please request a new code.';
      default:
        return error?.message || 'Authentication failed. Please try again.';
    }
  },
};
