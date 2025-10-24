'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import SearchBar from './SearchBar';
import CartIcon from './CartIcon';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="bg-gradient-to-b from-primary to-primary-light text-white sticky top-0 z-50">
      <div className="container">
        {/* Top Header */}
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold">Centimet2</h1>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-2xl mx-8">
            <SearchBar />
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-6">
            {/* User Profile Dropdown */}
            {isAuthenticated ? (
              <div className="hidden md:block relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 hover:opacity-90"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  <span className="text-sm">{user?.username || 'Account'}</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/my-posts"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      My Posts
                    </Link>
                    <Link
                      href="/posts/create"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Create Post
                    </Link>
                    {isAdmin(user) && (
                      <>
                        <hr className="my-1" />
                        <Link
                          href="/admin/users"
                          className="block px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 font-medium"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            Manage Users
                          </span>
                        </Link>
                      </>
                    )}
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setProfileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="hidden md:flex items-center gap-2 hover:opacity-90">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                <span className="text-sm">Login</span>
              </Link>
            )}

            <CartIcon />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <div className="md:hidden pb-3">
          <SearchBar />
        </div>

        {/* Navigation */}
        <nav className="hidden md:block border-t border-white/20 -mt-2">
          <ul className="flex gap-6 py-2">
            <li>
              <Link href="/san-pham" className="text-sm hover:opacity-90">
                Sản phẩm
              </Link>
            </li>
            <li>
              <Link href="/danh-muc" className="text-sm hover:opacity-90">
                Danh mục
              </Link>
            </li>
            <li>
              <Link href="/studio" className="text-sm hover:opacity-90">
                Studio
              </Link>
            </li>
            <li>
              <Link href="/tin-tuc" className="text-sm hover:opacity-90">
                Tin tức
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white text-gray-800">
          <nav className="container py-4">
            <ul className="space-y-4">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link href="/profile" className="block py-2 font-semibold">
                      Profile ({user?.username})
                    </Link>
                  </li>
                  <li>
                    <Link href="/my-posts" className="block py-2">
                      My Posts
                    </Link>
                  </li>
                  <li>
                    <Link href="/posts/create" className="block py-2">
                      Create Post
                    </Link>
                  </li>
                  {isAdmin(user) && (
                    <li>
                      <Link href="/admin/users" className="block py-2 text-purple-700 font-medium">
                        🔐 Manage Users (Admin)
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 text-red-600"
                    >
                      Logout
                    </button>
                  </li>
                  <hr className="my-2" />
                </>
              ) : (
                <li>
                  <Link href="/login" className="block py-2">
                    Login
                  </Link>
                </li>
              )}
              <li>
                <Link href="/san-pham" className="block py-2">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link href="/danh-muc" className="block py-2">
                  Danh mục
                </Link>
              </li>
              <li>
                <Link href="/studio" className="block py-2">
                  Studio
                </Link>
              </li>
              <li>
                <Link href="/tin-tuc" className="block py-2">
                  Tin tức
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
