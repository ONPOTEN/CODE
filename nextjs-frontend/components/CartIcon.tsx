'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/contexts/CartContext';

export default function CartIcon() {
  const { getTotalItems } = useCart();
  const [cartCount, setCartCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      setCartCount(getTotalItems());
    }
  }, [isHydrated]);

  // Force update when cart changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isHydrated) {
        setCartCount(getTotalItems());
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isHydrated]);

  return (
    <Link href="/cart" className="relative text-gray-700 hover:text-blue-500 transition-colors group">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-blue-600 text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex-center animate-pulse-soft">
          {cartCount}
        </span>
      )}
    </Link>
  );
}
