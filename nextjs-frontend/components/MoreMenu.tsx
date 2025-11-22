'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function MoreMenu() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="relative" ref={menuRef}>
      {/* Three Dots Menu Button */}
      <button
        onClick={toggleMenu}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
        aria-label="More options"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-0.9 2-2s-0.9-2-2-2-2 0.9-2 2 0.9 2 2 2zm0 2c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2zm0 6c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
          {isAuthenticated ? (
            <div className="divide-y divide-gray-200 py-1">
              <Link
                href="/profile"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Profile
              </Link>

              <Link
                href="/my-posts"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                My Posts
              </Link>

              <Link
                href="/my-orders"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                My Orders
              </Link>

              {user && (
                <Link
                  href={`/users/${user.id}/wall`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  My Wall
                </Link>
              )}

              <Link
                href="/posts/create"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Create Post
              </Link>

              <Link
                href="/my-shops"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                My Shops
              </Link>

              <Link
                href="/messages"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Inbox
              </Link>

              <Link
                href="/shop-messages"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium flex items-center justify-between"
                onClick={() => setIsOpen(false)}
              >
                <span>Shop Messages</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  New
                </span>
              </Link>

              <Link
                href="/groups"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Groups
              </Link>

              <Link
                href="/my-groups"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                My Groups
              </Link>

              <Link
                href="/admin/shops"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Shop Admin
              </Link>

              <div className="px-4 py-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Discover</p>
                <Link
                  href="/groups"
                  className="block px-0 py-2 hover:text-blue-600 transition-colors text-gray-900 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Discover Groups
                </Link>
                <Link
                  href="/shops"
                  className="block px-0 py-2 hover:text-blue-600 transition-colors text-gray-900 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Find Shops
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 py-1">
              <Link
                href="/api-test"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Browse Posts
              </Link>

              <Link
                href="/groups"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Browse Groups
              </Link>

              <Link
                href="/register"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Create Account
              </Link>

              <Link
                href="/login"
                className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>

              <div className="px-4 py-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Discover</p>
                <Link
                  href="/groups"
                  className="block px-0 py-2 hover:text-blue-600 transition-colors text-gray-900 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Discover Groups
                </Link>
                <Link
                  href="/shops"
                  className="block px-0 py-2 hover:text-blue-600 transition-colors text-gray-900 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Find Shops
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
