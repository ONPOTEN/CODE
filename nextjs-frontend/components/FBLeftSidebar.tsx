'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

interface SidebarItem {
  label: string;
  href: string;
  icon: string;
  badge?: number | string;
  adminOnly?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Bạn bè',
    items: [
      {
        label: 'Bạn bè',
        href: '/friends',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill="currentColor" d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>`,
      },
      {
        label: 'Nhóm',
        href: '/groups',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill="currentColor" d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>`,
      },
      {
        label: 'Marketplace',
        href: '/shops/feed',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill="currentColor" d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path></svg>`,
      },
      {
        label: 'Video',
        href: '/watch',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill="currentColor" d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path></svg>`,
      },
    ],
  },
  {
    title: 'Cá nhân',
    items: [
      {
        label: 'Bài viết của bạn',
        href: '/my-posts',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill="currentColor" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path></svg>`,
      },
      {
        label: 'Cửa hàng của bạn',
        href: '/my-shops',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill="currentColor" d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>`,
      },
      {
        label: 'Đơn mua',
        href: '/my-orders',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill="currentColor" d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z"></path></svg>`,
      },
      {
        label: 'Tin nhắn',
        href: '/messages',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path></svg>`,
      },
    ],
  },
  {
    title: 'Cài đặt',
    items: [
      {
        label: 'Quản trị viên',
        href: '/admin',
        icon: `<svg viewBox="0 0 20 20" class="w-6 h-6"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path></svg>`,
        adminOnly: true,
      },
    ],
  },
];

export default function FBLeftSidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const shouldShowItem = (item: SidebarItem) => {
    if (item.adminOnly) {
      return isAuthenticated && isAdmin(user);
    }
    return true;
  };

  return (
    <aside className="hidden lg:block w-[280px] sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto py-4">
      <div className="px-2 space-y-1">
        {sidebarSections.map((section) => {
          const filteredItems = section.items.filter(shouldShowItem);
          if (filteredItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              <h3 className="px-3 mb-1 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                {section.title}
              </h3>
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                    isActive(item.href)
                      ? 'bg-gray-100 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div
                    className={`w-9 h-9 flex items-center justify-center rounded-lg ${
                      isActive(item.href) ? 'bg-[#1877f2]/10 text-[#1877f2]' : 'bg-gray-100'
                    }`}
                  >
                    <span dangerouslySetInnerHTML={{ __html: item.icon }} />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-[#1877f2] text-white text-xs font-semibold rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          );
        })}

        {/* Phần lối tắt */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="px-3 mb-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Lối tắt
          </h3>
          <Link
            href="/groups/create"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-all duration-150"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100">
              <svg className="w-5 h-5 text-[#31a24c]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span>Tạo nhóm mới</span>
          </Link>
          <Link
            href="/shops/create"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-all duration-150"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100">
              <svg className="w-5 h-5 text-[#1877f2]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span>Tạo cửa hàng</span>
          </Link>
          <Link
            href="/posts/create"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-all duration-150"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100">
              <svg className="w-5 h-5 text-[#1877f2]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
            <span>Đăng bài viết</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
