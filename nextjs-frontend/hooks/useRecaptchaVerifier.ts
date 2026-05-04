'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface UseRecaptchaVerifierOptions {
  containerId?: string;
  size?: 'invisible' | 'normal' | 'compact';
  onSuccess?: (token: string) => void;
  onExpired?: () => void;
  onError?: (error: Error) => void;
}

interface UseRecaptchaVerifierReturn {
  recaptchaVerifier: RecaptchaVerifier | null;
  isReady: boolean;
  error: string | null;
  reset: () => void;
  render: () => Promise<void>;
}

// Global registry to track which containers have been initialized
const initializedContainers = new Set<string>();

/**
 * Custom hook for managing Firebase reCAPTCHA verifier
 * Handles initialization, cleanup, and error recovery
 */
export function useRecaptchaVerifier(
  options: UseRecaptchaVerifierOptions = {}
): UseRecaptchaVerifierReturn {
  const {
    containerId = 'recaptcha-container',
    size = 'invisible',
    onSuccess,
    onExpired,
    onError,
  } = options;

  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const isInitializingRef = useRef(false);
  const isMountedRef = useRef(true);

  /**
   * Clear existing verifier
   */
  const clearVerifier = useCallback(() => {
    if (verifierRef.current) {
      try {
        verifierRef.current.clear();
        console.log('[reCAPTCHA] Cleared existing verifier');
      } catch (e) {
        console.warn('[reCAPTCHA] Error clearing verifier:', e);
      }
      verifierRef.current = null;
    }
    // Remove from global registry
    initializedContainers.delete(containerId);
    setRecaptchaVerifier(null);
    setIsReady(false);
  }, [containerId]);

  /**
   * Clear the container's innerHTML to remove any existing reCAPTCHA widgets
   */
  const clearContainer = useCallback(() => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      console.log('[reCAPTCHA] Cleared container innerHTML');
    }
  }, [containerId]);

  /**
   * Initialize reCAPTCHA verifier
   */
  const initializeVerifier = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('[reCAPTCHA] Already initializing, skipping...');
      return;
    }

    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Check if Firebase auth is available
    if (!auth) {
      console.error('[reCAPTCHA] Firebase auth not initialized');
      setError('Firebase not initialized');
      return;
    }

    // Check if container exists
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[reCAPTCHA] Container #${containerId} not found, retrying...`);
      // Container might not be rendered yet, wait and retry
      setTimeout(() => {
        if (isMountedRef.current) {
          initializeVerifier();
        }
      }, 100);
      return;
    }

    // Check if already initialized (from previous render or StrictMode double-render)
    if (initializedContainers.has(containerId)) {
      console.log('[reCAPTCHA] Container already initialized, using existing verifier');
      setIsReady(true);
      return;
    }

    isInitializingRef.current = true;
    setError(null);

    try {
      // Clear any existing content in container
      clearContainer();

      console.log('[reCAPTCHA] Initializing verifier...');
      console.log('[reCAPTCHA] Domain:', window.location.hostname);
      console.log('[reCAPTCHA] Container ID:', containerId);
      console.log('[reCAPTCHA] Size:', size);

      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: size,
        callback: (token: string) => {
          console.log('[reCAPTCHA] Verification successful');
          if (isMountedRef.current) {
            setIsReady(true);
            onSuccess?.(token);
          }
        },
        'expired-callback': () => {
          console.log('[reCAPTCHA] Token expired');
          if (isMountedRef.current) {
            setIsReady(false);
            onExpired?.();
          }
        },
        'error-callback': (err: any) => {
          console.error('[reCAPTCHA] Error callback:', err);
          if (isMountedRef.current) {
            setError('reCAPTCHA verification failed');
            onError?.(err);
          }
        },
      });

      verifierRef.current = verifier;

      // Mark container as initialized
      initializedContainers.add(containerId);

      // For invisible reCAPTCHA, we need to render it
      if (size === 'invisible') {
        await verifier.render();
        console.log('[reCAPTCHA] Invisible verifier rendered successfully');
      }

      if (isMountedRef.current) {
        setRecaptchaVerifier(verifier);
        setIsReady(true);
        console.log('[reCAPTCHA] Verifier initialized successfully');
      }
    } catch (err: any) {
      console.error('[reCAPTCHA] Initialization error:', err);

      // Handle "already rendered" error - this is actually OK
      if (err.message?.includes('already been rendered')) {
        console.log('[reCAPTCHA] Already rendered, considering as ready');
        initializedContainers.add(containerId);
        if (isMountedRef.current) {
          setIsReady(true);
          setError(null);
        }
        isInitializingRef.current = false;
        return;
      }

      // Handle specific error codes
      let errorMessage = 'Failed to initialize reCAPTCHA';

      if (err.code === 'auth/captcha-check-failed') {
        errorMessage = 'reCAPTCHA verification failed. Please ensure your domain is authorized in Firebase Console.';
      } else if (err.code === 'auth/invalid-app-credential') {
        errorMessage = 'Invalid Firebase credentials. Please check your configuration.';
      } else if (err.message?.includes('reCAPTCHA')) {
        errorMessage = err.message;
      }

      if (isMountedRef.current) {
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [containerId, size, clearContainer, onSuccess, onExpired, onError]);

  /**
   * Reset the verifier (useful after failed attempts)
   */
  const reset = useCallback(() => {
    console.log('[reCAPTCHA] Resetting verifier...');
    clearVerifier();
    clearContainer();
    // Re-initialize after a short delay
    setTimeout(() => {
      if (isMountedRef.current) {
        initializeVerifier();
      }
    }, 500);
  }, [clearVerifier, clearContainer, initializeVerifier]);

  /**
   * Manually render the verifier
   */
  const render = useCallback(async () => {
    if (verifierRef.current) {
      try {
        await verifierRef.current.render();
        setIsReady(true);
      } catch (err: any) {
        // Already rendered is OK
        if (err.message?.includes('already been rendered')) {
          setIsReady(true);
        } else {
          console.error('[reCAPTCHA] Render error:', err);
        }
      }
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    isMountedRef.current = true;

    // Small delay to ensure container is rendered
    const timeoutId = setTimeout(() => {
      initializeVerifier();
    }, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
      // Don't clear on unmount to avoid issues with StrictMode
      // clearVerifier();
    };
  }, [initializeVerifier]);

  // Cleanup on unmount
  useEffect(() => {
    let cleanupTimeoutId: ReturnType<typeof setTimeout> | null = null;

    return () => {
      // Clear the container and registry when component unmounts for real
      // Use a small delay to distinguish from StrictMode remount
      cleanupTimeoutId = setTimeout(() => {
        if (!isMountedRef.current) {
          clearVerifier();
          clearContainer();
        }
      }, 100);
    };
  }, [clearVerifier, clearContainer]);

  return {
    recaptchaVerifier,
    isReady,
    error,
    reset,
    render,
  };
}

export default useRecaptchaVerifier;
