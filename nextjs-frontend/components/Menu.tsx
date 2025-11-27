'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Menu() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <section className="py-12">
      <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-sm p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Welcome to Centimet2
        </h1>
        <p className="text-gray-600 text-center mb-8 text-lg">
          A modern marketplace platform powered by Next.js and Laravel
        </p>

        <div className="mt-12 relative">
          <button
            onClick={toggleMenu}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>Quick Actions</span>
            <svg
              className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="mt-4 bg-gray-50 border border-gray-300 rounded-lg shadow-lg overflow-hidden">
              {isAuthenticated ? (
                <div className="divide-y divide-neutral-700">
                  <Link
                    href="/profile"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Profile</h3>
                    <p className="text-gray-600 text-sm">
                      View and manage your profile
                    </p>
                  </Link>

                  <Link
                    href="/my-posts"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">My Posts</h3>
                    <p className="text-gray-600 text-sm">
                      Manage your posts and content
                    </p>
                  </Link>

                  <Link
                    href="/my-orders"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">My Orders</h3>
                    <p className="text-gray-600 text-sm">
                      View your orders and order history
                    </p>
                  </Link>

                  {user && (
                    <Link
                      href={`/users/${user.id}/wall`}
                      className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <h3 className="font-semibold text-lg mb-1 text-gray-900">My Wall</h3>
                      <p className="text-gray-600 text-sm">
                        View and manage your personal wall
                      </p>
                    </Link>
                  )}

                  <Link
                    href="/posts/create"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Create Post</h3>
                    <p className="text-gray-600 text-sm">
                      Share your ideas with posts
                    </p>
                  </Link>

                  <Link
                    href="/my-shops"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">My Shops</h3>
                    <p className="text-gray-600 text-sm">
                      View and manage your shops
                    </p>
                  </Link>

                  <Link
                    href="/messages"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2 text-gray-900">
                      📬 Inbox
                    </h3>
                    <p className="text-gray-600 text-sm">
                      View all conversations, customer messages, and shop messages
                    </p>
                  </Link>

                  <Link
                    href="/shop-messages"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2 text-gray-900">
                      Shop Messages
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-gray-900 bg-red-500 rounded-full">
                        New
                      </span>
                    </h3>
                    <p className="text-gray-600 text-sm">
                      View customer messages for your shops
                    </p>
                  </Link>

                  <Link
                    href="/groups"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Groups</h3>
                    <p className="text-gray-600 text-sm">
                      Browse and manage community groups
                    </p>
                  </Link>

                  <Link
                    href="/my-groups"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">My Groups</h3>
                    <p className="text-gray-600 text-sm">
                      Manage groups you own
                    </p>
                  </Link>

                  <Link
                    href="/admin/shops"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Shop Admin</h3>
                    <p className="text-gray-600 text-sm">
                      Manage pending shops
                    </p>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-neutral-700">
                  <Link
                    href="/api-test"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Browse Posts</h3>
                    <p className="text-gray-600 text-sm">
                      Explore content from our community
                    </p>
                  </Link>

                  <Link
                    href="/groups"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Browse Groups</h3>
                    <p className="text-gray-600 text-sm">
                      Discover community groups and join
                    </p>
                  </Link>

                  <Link
                    href="/register"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Create Account</h3>
                    <p className="text-gray-600 text-sm">
                      Join our community today
                    </p>
                  </Link>

                  <Link
                    href="/login"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Login</h3>
                    <p className="text-gray-600 text-sm">
                      Access your account
                    </p>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
