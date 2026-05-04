'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { useState, useRef, useEffect } from 'react';

interface NavItem {
  label: string;
  icon: string;
  href: string;
  activeIcon?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Trang chủ',
    icon: `<svg viewBox="0 0 28 28" class="w-7 h-7"><path d="M25.825 12.29C25.824 12.289 25.823 12.288 25.821 12.286L15.027 2.938C14.752 2.675 14.391 2.528 14.013 2.528C13.634 2.528 13.272 2.675 13 2.938L2.203 12.29C1.536 12.891 1.648 13.392 1.783 13.637C1.918 13.883 2.305 14.156 3.002 14.156H4.75V22.5C4.75 23.742 5.758 24.75 7 24.75H11V19C11 18.448 11.448 18 12 18H16C16.552 18 17 18.448 17 19V24.75H21C22.242 24.75 23.25 23.742 23.25 22.5V14.156H24.997C25.694 14.156 26.081 13.883 26.216 13.637C26.351 13.392 26.462 12.891 25.825 12.29Z" fill="currentColor"></path></svg>`,
    href: '/',
  },
  {
    label: 'Bạn bè',
    icon: `<svg viewBox="0 0 28 28" class="w-7 h-7"><path d="M13.75 7.75C15.404 7.75 16.75 6.404 16.75 4.75C16.75 3.096 15.404 1.75 13.75 1.75C12.096 1.75 10.75 3.096 10.75 4.75C10.75 6.404 12.096 7.75 13.75 7.75ZM8.5 9.75H5.25C4.422 9.75 3.75 10.422 3.75 11.25V15.25H5.5V24.25H9.5V17.75H11.5V24.25H15.5V11.25C15.5 10.422 14.828 9.75 14 9.75H11.5V11.75H9.5V9.75ZM22.25 9.75H18.25V24.25H22.25V17.75H24.25V15.25H22.25V9.75ZM18.75 7.75C20.404 7.75 21.75 6.404 21.75 4.75C21.75 3.096 20.404 1.75 18.75 1.75C17.096 1.75 15.75 3.096 15.75 4.75C15.75 6.404 17.096 7.75 18.75 7.75Z" fill="currentColor"></path></svg>`,
    href: '/friends',
  },
  {
    label: 'Video',
    icon: `<svg viewBox="0 0 28 28" class="w-7 h-7"><path d="M8.75 24.25H19.25C20.904 24.25 22.25 22.904 22.25 21.25V6.75C22.25 5.096 20.904 3.75 19.25 3.75H8.75C7.096 3.75 5.75 5.096 5.75 6.75V21.25C5.75 22.904 7.096 24.25 8.75 24.25ZM11.5 11.75L17.5 15.25L11.5 18.75V11.75Z" fill="currentColor"></path></svg>`,
    href: '/watch',
  },
  {
    label: 'Cửa hàng',
    icon: `<svg viewBox="0 0 28 28" class="w-7 h-7"><path d="M19.75 8.5H8.25V5.75C8.25 4.784 9.034 4 10 4H18C18.966 4 19.75 4.784 19.75 5.75V8.5ZM21.25 8.5V5.75C21.25 3.955 19.795 2.5 18 2.5H10C8.205 2.5 6.75 3.955 6.75 5.75V8.5H4C3.586 8.5 3.25 8.836 3.25 9.25V11.75C3.25 12.164 3.586 12.5 4 12.5H5.5V22.75C5.5 24.544 6.955 26 8.75 26H19.25C21.045 26 22.5 24.544 22.5 22.75V12.5H24C24.414 12.5 24.75 12.164 24.75 11.75V9.25C24.75 8.836 24.414 8.5 24 8.5H21.25ZM9.25 14.75C9.25 14.336 9.586 14 10 14C10.414 14 10.75 14.336 10.75 14.75V21.75C10.75 22.164 10.414 22.5 10 22.5C9.586 22.5 9.25 22.164 9.25 21.75V14.75ZM13.25 14.75C13.25 14.336 13.586 14 14 14C14.414 14 14.75 14.336 14.75 14.75V21.75C14.75 22.164 14.414 22.5 14 22.5C13.586 22.5 13.25 22.164 13.25 21.75V14.75ZM17.25 14.75C17.25 14.336 17.586 14 18 14C18.414 14 18.75 14.336 18.75 14.75V21.75C18.75 22.164 18.414 22.5 18 22.5C17.586 22.5 17.25 22.164 17.25 21.75V14.75Z" fill="currentColor"></path></svg>`,
    href: '/shops/feed',
  },
  {
    label: 'Nhóm',
    icon: `<svg viewBox="0 0 28 28" class="w-7 h-7"><path d="M5.75 21.25H22.25V19.75H5.75V21.25ZM17.5 14.5C16.395 14.5 15.5 13.605 15.5 12.5C15.5 11.395 16.395 10.5 17.5 10.5C18.605 10.5 19.5 11.395 19.5 12.5C19.5 13.605 18.605 14.5 17.5 14.5ZM9.5 14.5C8.395 14.5 7.5 13.605 7.5 12.5C7.5 11.395 8.395 10.5 9.5 10.5C10.605 10.5 11.5 11.395 11.5 12.5C11.5 13.605 10.605 14.5 9.5 14.5ZM13.5 9C12.395 9 11.5 8.105 11.5 7C11.5 5.895 12.395 5 13.5 5C14.605 5 15.5 5.895 15.5 7C15.5 8.105 14.605 9 13.5 9ZM4 24.75H24C24.414 24.75 24.75 24.414 24.75 24C24.75 23.586 24.414 23.25 24 23.25H4C3.586 23.25 3.25 23.586 3.25 24C3.25 24.414 3.586 24.75 4 24.75Z" fill="currentColor"></path></svg>`,
    href: '/groups',
  },
];

export default function FBNavbar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 h-14 bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-4 max-w-[1920px] mx-auto">
        {/* Phần bên trái - Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 36 36" className="w-10 h-10 text-[#1877f2]" fill="currentColor">
              <path d="M20.181 35.87C29.094 34.791 36 27.202 36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 4.991 2.033 9.5 5.313 12.756V35.87h14.868z"></path>
              <path fill="#fff" d="M13.651 34.277C19.406 33.778 24 27.019 24 18c0-9.941-5.373-18-12-18S0 8.059 0 18c0 4.991 1.357 9.5 3.542 12.756v3.521h10.109z"></path>
            </svg>
          </Link>
          <div className="hidden md:block relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm trên Centimet"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="fb-search-input"
            />
          </div>
        </div>

        {/* Phần giữa - Điều hướng */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-center w-[110px] h-12 rounded-lg transition-all duration-150 ${
                isActive(item.href)
                  ? 'text-[#1877f2] font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span
                dangerouslySetInnerHTML={{ __html: item.icon }}
                className="w-7 h-7"
              />
              {isActive(item.href) && (
                <span className="absolute bottom-0 w-5 h-1 bg-[#1877f2] rounded-t-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Phần bên phải - Hành động người dùng */}
        <div className="flex items-center gap-1">
          {/* Nút menu */}
          <button className="btn-icon-sm hidden lg:flex">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* Tin nhắn */}
          <Link href="/messages" className="btn-icon-sm relative">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.92 1.56 5.47 4 6.32V22l4.5-2.5c.5.08 1 .12 1.5.12 5.52 0 10-3.58 10-8s-4.48-8-10-8zm-1 12h-2v-2h2v2zm0-4h-2V7h2v3z" />
            </svg>
          </Link>

          {/* Thông báo */}
          <button className="btn-icon-sm relative">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <span className="fb-badge-notification">3</span>
          </button>

          {/* Hồ sơ người dùng */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isAuthenticated && user ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </button>

            {/* Menu thả xuống */}
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 w-[320px] fb-card fb-animate-fadeIn z-50">
                <div className="p-2">
                  {isAuthenticated && user ? (
                    <>
                      <Link
                        href={`/users/${user.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        <div className="w-9 h-9 rounded-full bg-[#1877f2] flex items-center justify-center">
                          <span className="text-sm font-semibold text-white">
                            {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold">{user.display_name || 'Người dùng'}</p>
                          <p className="text-sm text-gray-600">Xem trang cá nhân</p>
                        </div>
                      </Link>
                      <div className="fb-divider my-2" />
                      <Link
                        href="/profile"
                        className="fb-dropdown-item"
                        onClick={() => setShowMenu(false)}
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm12 4c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-9 8c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1H6v-1z" />
                        </svg>
                        <span>Thông tin tài khoản</span>
                      </Link>
                      {isAdmin(user) && (
                        <Link
                          href="/admin"
                          className="fb-dropdown-item"
                          onClick={() => setShowMenu(false)}
                        >
                          <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                          </svg>
                          <span>Quản trị viên</span>
                        </Link>
                      )}
                      <div className="fb-divider my-2" />
                      <Link
                        href="/my-shops"
                        className="fb-dropdown-item"
                        onClick={() => setShowMenu(false)}
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
                        </svg>
                        <span>Cửa hàng của bạn</span>
                      </Link>
                      <Link
                        href="/my-orders"
                        className="fb-dropdown-item"
                        onClick={() => setShowMenu(false)}
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                        </svg>
                        <span>Đơn mua</span>
                      </Link>
                      <Link
                        href="/my-posts"
                        className="fb-dropdown-item"
                        onClick={() => setShowMenu(false)}
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>
                        <span>Bài viết của bạn</span>
                      </Link>
                      <div className="fb-divider my-2" />
                      <button className="w-full fb-dropdown-item text-[#f02849]">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                        </svg>
                        <span>Đăng xuất</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="fb-dropdown-item"
                        onClick={() => setShowMenu(false)}
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
                        </svg>
                        <span>Đăng nhập</span>
                      </Link>
                      <Link
                        href="/register"
                        className="fb-dropdown-item"
                        onClick={() => setShowMenu(false)}
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <span>Đăng ký</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Điều hướng di động */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-gray-200 flex items-center justify-around px-2 z-50">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-150 ${
              isActive(item.href) ? 'text-[#1877f2]' : 'text-gray-600'
            }`}
          >
            <span
              dangerouslySetInnerHTML={{ __html: item.icon }}
              className="w-7 h-7"
            />
          </Link>
        ))}
        <button className="btn-icon-sm">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
