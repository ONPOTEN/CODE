'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CartIcon from './CartIcon';
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
            <CartIcon />
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
