'use client';

import { useEffect, useState } from 'react';

interface ShareToastProps {
  message: string;
  duration?: number;
  isVisible: boolean;
  onClose: () => void;
}

export function ShareToast({ message, duration = 3000, isVisible, onClose }: ShareToastProps) {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <span className="text-xl">✓</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
