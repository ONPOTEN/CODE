'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function CartIcon() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Load cart count from localStorage or state management
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cart = JSON.parse(savedCart);
      setCartCount(cart.length || 0);
    }
  }, []);

  return (
    <Link href="/gio-hang" className="relative hover:opacity-90">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-white text-primary text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center border-2 border-primary">
          {cartCount}
        </span>
      )}
    </Link>
  );
}
