'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: (isActive: boolean) => React.ReactNode;
}

const BottomNav: React.FC = () => {
  const pathname = usePathname();

  // Hide bottom nav on post detail pages (e.g., /posts/123 or /posts/slug-name)
  const isPostDetailPage = pathname?.startsWith('/posts/') && pathname !== '/posts/create';

  if (isPostDetailPage) {
    return null;
  }

  const navItems: NavItem[] = [
    {
      label: 'Home',
      href: '/',
      icon: (isActive) => (
        <svg
          className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`}
          fill={isActive ? 'currentColor' : 'none'}
          stroke={isActive ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4-4" />
        </svg>
      ),
    },
    {
      label: 'Groups',
      href: '/groups',
      icon: (isActive) => (
        <svg
          className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`}
          fill={isActive ? 'currentColor' : 'none'}
          stroke={isActive ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: 'Create',
      href: '/posts/create',
      icon: (isActive) => (
        <svg
          className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`}
          fill={isActive ? 'currentColor' : 'none'}
          stroke={isActive ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: 'Messages',
      href: '/messages',
      icon: (isActive) => (
        <svg
          className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`}
          fill={isActive ? 'currentColor' : 'none'}
          stroke={isActive ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: (isActive) => (
        <svg
          className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`}
          fill={isActive ? 'currentColor' : 'none'}
          stroke={isActive ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-gray-100 border-t border-gray-200 flex lg:hidden z-50">
      <div className="w-full flex items-center justify-around px-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-16 transition-all ${
                active
                  ? 'text-primary-DEFAULT'
                  : 'text-text-tertiary hover:text-text-secondary active:text-text-primary'
              }`}
              title={item.label}
            >
              <div className="flex items-center justify-center">
                {item.icon(active)}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
