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
          Chào mừng đến với Centimet2
        </h1>
        <p className="text-gray-600 text-center mb-8 text-lg">
          Sàn thương mại hiện đại được xây dựng bởi Next.js và Laravel
        </p>

        <div className="mt-12 relative">
          <button
            onClick={toggleMenu}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>Hành động nhanh</span>
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
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Hồ sơ</h3>
                    <p className="text-gray-600 text-sm">
                      Xem và quản lý hồ sơ của bạn
                    </p>
                  </Link>

                  <Link
                    href="/my-posts"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Bài viết của tôi</h3>
                    <p className="text-gray-600 text-sm">
                      Quản lý bài viết và nội dung của bạn
                    </p>
                  </Link>

                  <Link
                    href="/my-orders"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Đơn hàng của tôi</h3>
                    <p className="text-gray-600 text-sm">
                      Xem đơn hàng và lịch sử mua hàng
                    </p>
                  </Link>

                  {user && (
                    <Link
                      href={`/users/${user.id}/wall`}
                      className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <h3 className="font-semibold text-lg mb-1 text-gray-900">Tường của tôi</h3>
                      <p className="text-gray-600 text-sm">
                        Xem và quản lý tường cá nhân của bạn
                      </p>
                    </Link>
                  )}

                  <Link
                    href="/posts/create"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Tạo bài viết</h3>
                    <p className="text-gray-600 text-sm">
                      Chia sẻ ý tưởng của bạn qua bài viết
                    </p>
                  </Link>

                  <Link
                    href="/my-shops"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Cửa hàng của tôi</h3>
                    <p className="text-gray-600 text-sm">
                      Xem và quản lý cửa hàng của bạn
                    </p>
                  </Link>

                  <Link
                    href="/messages"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2 text-gray-900">
                      📬 Hộp thư
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Xem tất cả cuộc trò chuyện, tin nhắn khách hàng và tin nhắn cửa hàng
                    </p>
                  </Link>

                  <Link
                    href="/shop-messages"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2 text-gray-900">
                      Tin nhắn cửa hàng
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-gray-900 bg-red-500 rounded-full">
                        Mới
                      </span>
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Xem tin nhắn khách hàng cho cửa hàng của bạn
                    </p>
                  </Link>

                  <Link
                    href="/groups"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Nhóm</h3>
                    <p className="text-gray-600 text-sm">
                      Xem và quản lý các nhóm cộng đồng
                    </p>
                  </Link>

                  <Link
                    href="/my-groups"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Nhóm của tôi</h3>
                    <p className="text-gray-600 text-sm">
                      Quản lý các nhóm bạn sở hữu
                    </p>
                  </Link>

                  <Link
                    href="/admin/shops"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Quản trị cửa hàng</h3>
                    <p className="text-gray-600 text-sm">
                      Quản lý các cửa hàng đang chờ duyệt
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
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Xem bài viết</h3>
                    <p className="text-gray-600 text-sm">
                      Khám phá nội dung từ cộng đồng của chúng tôi
                    </p>
                  </Link>

                  <Link
                    href="/groups"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Xem nhóm</h3>
                    <p className="text-gray-600 text-sm">
                      Khám phá và tham gia các nhóm cộng đồng
                    </p>
                  </Link>

                  <Link
                    href="/register"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Tạo tài khoản</h3>
                    <p className="text-gray-600 text-sm">
                      Tham gia cộng đồng của chúng tôi ngay hôm nay
                    </p>
                  </Link>

                  <Link
                    href="/login"
                    className="block px-6 py-4 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h3 className="font-semibold text-lg mb-1 text-gray-900">Đăng nhập</h3>
                    <p className="text-gray-600 text-sm">
                      Truy cập tài khoản của bạn
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
