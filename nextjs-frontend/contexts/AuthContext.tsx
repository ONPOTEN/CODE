'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, LoginResponse, ApiException, RegisterData } from '@/lib/api';

interface AuthUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  hobby?: string;
  company?: string;
  location?: string;
  role?: string;
  avatar?: string;
  profile_visibility?: string;
  phone?: string;
  email_public?: boolean;
  hobby_public?: boolean;
  company_public?: boolean;
  location_public?: boolean;
  phone_public?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (data: RegisterData) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
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

  useEffect(() => {
    // Check if user is already authenticated
    const token = auth.getToken();
    if (token) {
      // In a real app, you'd verify the token with the backend
      // For now, we'll just mark as authenticated
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors(null);

      const response: LoginResponse = await auth.register(data);
      setUser(response.user);
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

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors(null);

      const response: LoginResponse = await auth.login(username, password);
      setUser(response.user);

      // Emit token update event so EngagementProviderWrapper can update
      const token = auth.getToken();
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

  const logout = async () => {
    try {
      setIsLoading(true);
      await auth.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Even if logout fails on backend, clear local state
      setUser(null);
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
        register,
        login,
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
