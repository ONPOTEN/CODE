'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { isAdmin } from '@/lib/roles';
import AdSenseBlock from '@/components/AdSenseBlock';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { isSidebarVisible, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const mainNavItems: NavItem[] = [
    {
      label: 'Trang chủ',
      href: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4-4" />
        </svg>
      ),
    },
    {
      label: 'Khám phá',
      href: '/groups',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      label: 'Tin nhắn',
      href: '/messages',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Cửa hàng',
      href: '/shops',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      label: 'Sản phẩm',
      href: '/shops/feed',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  const userNavItems: NavItem[] = isAuthenticated
    ? [
        {
          label: 'Hồ sơ',
          href: '/profile',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
        {
          label: 'Bài viết',
          href: '/my-posts',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: 'Cửa hàng',
          href: '/my-shops',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        // Admin link - only shown to admin users
        ...(isAdmin(user) ? [{
          label: 'Quản trị',
          href: '/admin',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        }] : []),
      ]
    : [];

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen w-sidebar bg-white border-r border-gray-300 flex-col hidden lg:flex z-[9999] transition-transform duration-300 ease-in-out ${
          isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Toggle button inside sidebar */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 z-50 flex items-center justify-center w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Ẩn thanh bên"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Logo/Branding */}
        <div className="p-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-blue-500 transition-colors">
          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
          <span>Centimet2</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}

        {/* Divider */}
        {isAuthenticated && <div className="divider my-4" />}

        {/* User Navigation */}
        {userNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}

        {/* Sidebar Ad Unit */}
        <div className="mt-8 px-2 overflow-hidden">
          <AdSenseBlock 
            client="ca-pub-8350902137868521"
            slot="6288245784"
            format="auto"
            responsive="true"
            className="scale-90 origin-top"
          />
        </div>
      </nav>

      {/* User Profile & Logout */}
      {isAuthenticated && user && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-200 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex-center">
              <span className="text-sm font-bold text-gray-900">
                {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.display_name || user.username || 'User'}
              </p>
              <p className="text-xs text-gray-600 truncate">@{user.username || 'user'}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full btn-secondary text-sm"
          >
            Đăng xuất
          </button>
        </div>
      )}

      {/* Login CTA for unauthenticated users */}
      {!isAuthenticated && (
        <div className="p-4 border-t border-gray-200">
          <Link href="/login" className="w-full btn-primary block text-center text-sm">
            Đăng nhập
          </Link>
        </div>
      )}
    </aside>

      {/* Toggle button - visible when sidebar is hidden */}
      <button
        onClick={toggleSidebar}
        className={`fixed left-0 top-6 z-50 hidden lg:flex items-center justify-center w-6 h-6 bg-white border border-gray-300 rounded-r-full shadow-md hover:bg-gray-100 transition-all duration-300 ease-in-out ${
          isSidebarVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Hiện thanh bên"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
};

export default Sidebar;
