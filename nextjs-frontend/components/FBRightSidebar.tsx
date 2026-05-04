'use client';

import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  avatar?: string;
  online?: boolean;
}

const mockContacts: Contact[] = [
  { id: '1', name: 'Nguyễn Văn A', online: true },
  { id: '2', name: 'Trần Thị B', online: true },
  { id: '3', name: 'Lê Văn C', online: false },
  { id: '4', name: 'Phạm Thị D', online: true },
  { id: '5', name: 'Hoàng Văn E', online: false },
  { id: '6', name: 'Vũ Thị F', online: true },
  { id: '7', name: 'Đặng Văn G', online: false },
  { id: '8', name: 'Bùi Thị H', online: true },
];

interface SponsoredItem {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
}

const mockSponsored: SponsoredItem[] = [
  {
    id: '1',
    title: 'Siêu thị công nghệ',
    description: 'Điện thoại, laptop giá rẻ',
    image: '📱',
    href: '#',
  },
  {
    id: '2',
    title: 'Thời trang nam nữ',
    description: 'Mặc đẹp mỗi ngày',
    image: '👕',
    href: '#',
  },
  {
    id: '3',
    title: 'Nhà hàng Online',
    description: 'Giao ăn tận nơi',
    image: '🍜',
    href: '#',
  },
];

export default function FBRightSidebar() {
  return (
    <aside className="hidden xl:block w-[280px] sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto py-4">
      <div className="px-2 space-y-4">
        {/* Phần được tài trợ */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-sm font-semibold">Được tài trợ</h3>
            <button className="text-gray-600 hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="space-y-1">
            {mockSponsored.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-150"
              >
                <div className="w-32 h-20 rounded-lg bg-gray-200 flex items-center justify-center text-3xl shrink-0">
                  {item.image}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.title}</p>
                  <p className="text-xs text-gray-600 truncate">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Đường kẻ phân cách */}
        <div className="fb-divider" />

        {/* Phần danh bạ */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-sm font-semibold">Người liên hệ</h3>
            <div className="flex items-center gap-1">
              <button className="text-gray-600 hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tìm kiếm danh bạ */}
          <div className="px-3 mb-2">
            <div className="relative">
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
                placeholder="Tìm kiếm"
                className="w-full h-8 pl-9 pr-3 bg-gray-100 rounded-full text-sm placeholder-gray-600 hover:bg-white focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-400 transition-all duration-150"
              />
            </div>
          </div>

          {/* Danh sách liên hệ */}
          <div className="space-y-0.5">
            {mockContacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/messages/${contact.id}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-150 group ${contact.online ? 'fb-avatar-online' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {contact.name.charAt(0)}
                  </span>
                </div>
                <span className="flex-1 text-sm group-hover:font-medium">
                  {contact.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Cuộc trò chuyện nhóm */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Cuộc trò chuyện nhóm
            </h3>
          </div>
          <div className="space-y-0.5">
            <Link
              href="/messages"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-150 group"
            >
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <span className="flex-1 text-sm group-hover:font-medium">
                Nhóm bạn bè
              </span>
            </Link>
            <Link
              href="/messages"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-150 group"
            >
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <span className="flex-1 text-sm group-hover:font-medium">
                Nhóm công việc
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Liên kết chân trang */}
      <div className="mt-4 px-3 pb-20">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600">
          <Link href="/about" className="hover:underline">
            Giới thiệu
          </Link>
          <span>.</span>
          <Link href="/help" className="hover:underline">
            Trợ giúp
          </Link>
          <span>.</span>
          <Link href="/privacy" className="hover:underline">
            Quyền riêng tư
          </Link>
          <span>.</span>
          <Link href="/terms" className="hover:underline">
            Điều khoản
          </Link>
          <span>.</span>
          <Link href="/ads" className="hover:underline">
            Quảng cáo
          </Link>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          Centimet2 © 2025
        </p>
      </div>
    </aside>
  );
}
