'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, LoginResponse, ApiException, RegisterData, tokenStorage } from '@/lib/api';
import { firebaseAuthService } from '@/lib/firebaseAuthService';
import { firebaseAuth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  hobby?: string;
  company?: string;
  occupation?: string;
  main_occupation?: string;
  location?: string;
  role?: string;
  avatar?: string;
  profile_visibility?: string;
  phone?: string;
  email_public?: boolean;
  hobby_public?: boolean;
  company_public?: boolean;
  occupation_public?: boolean;
  main_occupation_public?: boolean;
  location_public?: boolean;
  phone_public?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMethod?: string; // 'email', 'google', 'facebook', 'apple', 'phone', 'phone-password'
  register: (data: RegisterData) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  firebaseRegister: (email: string, password: string, displayName: string, nickname?: string) => Promise<void>;
  firebaseLoginEmail: (email: string, password: string) => Promise<void>;
  firebaseLoginNickname: (nickname: string, password: string) => Promise<void>;
  firebaseLoginPhonePassword: (phoneNumber: string, password: string) => Promise<void>;
  firebaseLoginGoogle: () => Promise<void>;
  firebaseLoginFacebook: () => Promise<void>;
  firebaseLoginApple: () => Promise<void>;
  facebookLogin: () => Promise<void>;
  googleLogin: () => Promise<void>;
  firebasePhoneVerify: (phoneNumber: string, recaptchaVerifier: any) => Promise<any>;
  firebasePhoneConfirm: (confirmationResult: any, code: string, phoneNumber: string) => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => void;
  updateUserProfile: (updatedUser: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
  error: string | null;
  validationErrors: Record<string, string[]> | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);
  const [authMethod, setAuthMethod] = useState<string | undefined>();

  useEffect(() => {
    // Check if user is already authenticated
    const token = tokenStorage.get();
    if (token) {
      // Token exists, user is authenticated
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }

    // Listen to Firebase auth state changes
    try {
      const unsubscribe = firebaseAuth.onAuthStateChanged((firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser && !token) {
          setUser(null);
        }
      });
      return unsubscribe;
    } catch (err) {
      // Firebase not initialized yet
      console.log('Firebase not initialized');
    }
  }, []);

  // Traditional email/password registration
  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors(null);

      const response: LoginResponse = await auth.register(data);
      setUser(response.user);
      setAuthMethod('email');
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
        if (err.errors) {
          setValidationErrors(err.errors);
        }
      } else {
        setError('Registration failed. Please try again.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Traditional email/password login
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors(null);

      const response: LoginResponse = await auth.login(username, password);
      setUser(response.user);
      setAuthMethod('email');

      // Emit token update event so EngagementProviderWrapper can update
      const token = tokenStorage.get();
      if (token && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
        if (err.errors) {
          setValidationErrors(err.errors);
        }
      } else {
        setError('Login failed. Please try again.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase email registration
  const firebaseRegister = async (email: string, password: string, displayName: string, nickname?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors(null);

      const response = await firebaseAuthService.registerWithEmail(email, password, displayName, nickname);
      if (response.success) {
        setUser(response.user as any);
        setAuthMethod('firebase-email');
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (err: any) {
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase email login
  const firebaseLoginEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors(null);

      const response = await firebaseAuthService.loginWithEmail(email, password);
      if (response.success) {
        setUser(response.user as any);
        setAuthMethod('firebase-email');

        // Emit token update event
        const token = tokenStorage.get();
        if (token && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
        }
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err: any) {
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase nickname login
  const firebaseLoginNickname = async (nickname: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors(null);

      const response = await firebaseAuthService.loginWithNickname(nickname, password);
      if (response.success) {
        setUser(response.user as any);
        setAuthMethod('firebase-nickname');

        // Emit token update event
        const token = tokenStorage.get();
        if (token && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
        }
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err: any) {
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase phone + password login
  const firebaseLoginPhonePassword = async (phoneNumber: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors(null);

      const response = await firebaseAuthService.loginWithPhonePassword(phoneNumber, password);
      if (response.success) {
        setUser(response.user as any);
        setAuthMethod('phone-password');

        // Emit token update event
        const token = tokenStorage.get();
        if (token && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
        }
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err: any) {
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase Google login
  const firebaseLoginGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await firebaseAuthService.signInWithGoogle();
      if (response.success) {
        setUser(response.user as any);
        setAuthMethod('google');

        const token = tokenStorage.get();
        if (token && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
        }
      } else {
        throw new Error(response.error || 'Google sign-in failed');
      }
    } catch (err: any) {
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase Facebook login
  const firebaseLoginFacebook = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await firebaseAuthService.signInWithFacebook();
      if (response.success) {
        setUser(response.user as any);
        setAuthMethod('facebook');

        const token = tokenStorage.get();
        if (token && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
        }
      } else {
        throw new Error(response.error || 'Facebook sign-in failed');
      }
    } catch (err: any) {
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase Apple login
  const firebaseLoginApple = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await firebaseAuthService.signInWithApple();
      if (response.success) {
        setUser(response.user as any);
        setAuthMethod('apple');

        const token = tokenStorage.get();
        if (token && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
        }
      } else {
        throw new Error(response.error || 'Apple sign-in failed');
      }
    } catch (err: any) {
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Facebook OAuth login (using Facebook SDK)
  const facebookLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if FB SDK is loaded
      if (typeof window === 'undefined' || !(window as any).FB) {
        throw new Error('Facebook SDK not loaded');
      }

      const FB = (window as any).FB;

      // Login with Facebook
      const loginResponse = await new Promise<any>((resolve, reject) => {
        FB.login((response: any) => {
          if (response.authResponse) {
            resolve(response);
          } else {
            reject(new Error('Facebook login cancelled or failed'));
          }
        }, { scope: 'email,public_profile' });
      });

      const accessToken = loginResponse.authResponse.accessToken;
      console.log('[AuthContext] Facebook access token obtained');

      // Send access token to Laravel backend
      const response = await auth.facebookLogin(accessToken);

      setUser(response.user as any);
      setAuthMethod('facebook');

      const token = tokenStorage.get();
      if (token && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
      }

      console.log('[AuthContext] Facebook login successful');
    } catch (err: any) {
      console.error('[AuthContext] Facebook login error:', err);
      setError(err.message || 'Facebook login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Google OAuth login (using Google SDK)
  const googleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if Google SDK is loaded
      if (typeof window === 'undefined' || !(window as any).google) {
        throw new Error('Google SDK not loaded');
      }

      const google = (window as any).google;

      // Use Google Identity Services
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '791242064597-3mfofd54joho65gkms9cc2439862j0bn.apps.googleusercontent.com',
        scope: 'email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.access_token) {
            console.log('[AuthContext] Google access token obtained');

            // Send access token to Laravel backend
            const response = await auth.googleLogin(tokenResponse.access_token);

            setUser(response.user as any);
            setAuthMethod('google');

            const token = tokenStorage.get();
            if (token && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
            }

            console.log('[AuthContext] Google login successful');
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (err: any) {
      console.error('[AuthContext] Google login error:', err);
      setError(err.message || 'Google login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase phone verification
  const firebasePhoneVerify = async (phoneNumber: string, recaptchaVerifier: any) => {
    try {
      setIsLoading(true);
      setError(null);

      return await firebaseAuthService.verifyPhoneNumber(phoneNumber, recaptchaVerifier);
    } catch (err: any) {
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase phone code confirmation
  const firebasePhoneConfirm = async (
    confirmationResult: any,
    code: string,
    phoneNumber: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[AuthContext] Confirming phone code...');

      const response = await firebaseAuthService.confirmPhoneCode(
        confirmationResult,
        code,
        phoneNumber
      );

      if (response.success) {
        console.log('[AuthContext] Phone verification successful!');
        console.log('[AuthContext] User data:', {
          id: response.user?.id,
          username: response.user?.username,
          email: response.user?.email,
        });

        // Set user state with returned user data
        setUser(response.user as any);
        setAuthMethod('phone');

        // Emit token updated event for engagement context
        const token = tokenStorage.get();
        if (token && typeof window !== 'undefined') {
          console.log('[AuthContext] Emitting tokenUpdated event');
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: token }));
        }
      } else {
        console.error('[AuthContext] Phone verification failed:', response.error);
        throw new Error(response.error || 'Phone verification failed');
      }
    } catch (err: any) {
      console.error('[AuthContext] Phone confirmation error:', err);
      const errorMessage = firebaseAuthService.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserAvatar = (avatarUrl: string) => {
    if (user) {
      setUser({
        ...user,
        avatar: avatarUrl,
      });
    }
  };

  const updateUserProfile = (updatedUser: Partial<AuthUser>) => {
    if (user) {
      console.log('[AuthContext] Updating user profile with:', updatedUser);
      setUser({
        ...user,
        ...updatedUser,
      });
      console.log('[AuthContext] User profile updated');
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await firebaseAuthService.logout();
      await auth.logout();
      setUser(null);
      setAuthMethod(undefined);
    } catch (err) {
      console.error('Logout error:', err);
      // Even if logout fails, clear local state
      setUser(null);
      setAuthMethod(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authMethod,
        register,
        login,
        firebaseRegister,
        firebaseLoginEmail,
        firebaseLoginNickname,
        firebaseLoginPhonePassword,
        firebaseLoginGoogle,
        firebaseLoginFacebook,
        firebaseLoginApple,
        facebookLogin,
        googleLogin,
        firebasePhoneVerify,
        firebasePhoneConfirm,
        updateUserAvatar,
        updateUserProfile,
        logout,
        error,
        validationErrors,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
