'use client';

import { ReactNode, useEffect, useState } from 'react';
import { EngagementProvider } from '@/contexts/EngagementContext';

export function EngagementProviderWrapper({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get token from localStorage when component mounts on client
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);
    setMounted(true);

    // Listen for storage changes (when token is updated in another tab or by auth context)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue) {
        setToken(e.newValue);
      }
    };

    // Listen for custom storage event in same tab
    const handleCustomStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setToken(customEvent.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenUpdated', handleCustomStorageChange);
    };
  }, []);

  // Don't render children until mounted on client to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <EngagementProvider token={token}>
      {children}
    </EngagementProvider>
  );
}
