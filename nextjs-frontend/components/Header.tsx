'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import MoreMenu from './MoreMenu';

export default function Header() {
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="px-4 py-3">
        {/* Top Header - Logo and Actions */}
        <div className="flex items-center justify-between mb-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-blue-500 transition-colors">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            </svg>
            <span>Threads</span>
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            {/* Products Feed Link */}
            <Link href="/shops/feed" className="relative text-gray-700 hover:text-blue-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Link>
            <MoreMenu />

            {/* User Profile Avatar */}
            {isAuthenticated && user ? (
              <Link
                href="/profile"
                className="flex-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                <span className="text-xs font-bold text-white">
                  {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
