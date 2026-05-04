'use client';

import { useState } from 'react';
import Link from 'next/link';
import Menu from '@/components/Menu';
import CreatePostModal from '@/components/CreatePostModal';
import InfiniteScrollPosts from '@/components/InfiniteScrollPosts';
import { useAuth } from '@/contexts/AuthContext';

interface Feature {
  title: string;
  description: string;
  icon: string;
  gradient: string;
  hoverGradient: string;
}

const features: Feature[] = [
  {
    title: 'Xác thực người dùng',
    description: 'Đăng nhập và đăng ký an toàn với Laravel Sanctum',
    icon: '🔐',
    gradient: 'from-indigo-500 to-purple-600',
    hoverGradient: 'from-indigo-600 to-purple-700',
  },
  {
    title: 'Quản lý nội dung',
    description: 'Tạo và quản lý bài viết với nội dung phong phú',
    icon: '📝',
    gradient: 'from-blue-500 to-cyan-500',
    hoverGradient: 'from-blue-600 to-cyan-600',
  },
  {
    title: 'Công nghệ hiện đại',
    description: 'Xây dựng với Next.js 15, React 19 và Laravel 11',
    icon: '🚀',
    gradient: 'from-emerald-500 to-teal-500',
    hoverGradient: 'from-emerald-600 to-teal-600',
  },
  {
    title: 'Tailwind CSS',
    description: 'Thành phần UI đẹp mắt và phản hồi nhanh',
    icon: '🎨',
    gradient: 'from-rose-500 to-orange-500',
    hoverGradient: 'from-rose-600 to-orange-600',
  },
];

export default function HomePage() {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Menu - Desktop Only */}
      <div className="hidden lg:block">
        <Menu />
      </div>



      {/* Recent Posts Section */}
      <section className="py-8 md:py-12 bg-gray-50">
        {/* Create Post Card (Facebook style) */}
        <div className="max-w-4xl mx-auto px-2 md:px-4 mb-2">
          <div className="bg-white rounded-xl shadow-sm p-3 md:p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-200">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </div>
              <button
                onClick={() => setIsCreatePostOpen(true)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-left text-gray-500 rounded-full py-2.5 px-4 transition-colors text-sm md:text-base font-medium"
              >
                Bạn đang nghĩ gì thế{user?.display_name ? `, ${user.display_name}` : ''}?
              </button>
            </div>
            
            <div className="border-t pt-3 flex items-center justify-between px-2">
              <button onClick={() => setIsCreatePostOpen(true)} className="flex flex-1 items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 font-medium text-sm md:text-base">
                <span className="text-red-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                </span>
                Video trực tiếp
              </button>
              <button onClick={() => setIsCreatePostOpen(true)} className="flex flex-1 items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 font-medium text-sm md:text-base">
                <span className="text-green-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                </span>
                Ảnh/video
              </button>
              <button onClick={() => setIsCreatePostOpen(true)} className="flex flex-1 items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 font-medium text-sm md:text-base hidden sm:flex">
                <span className="text-yellow-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11.5 8.5 11.5zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                </span>
                Cảm xúc/hoạt động
              </button>
            </div>
          </div>
        </div>

        <InfiniteScrollPosts />
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4 md:mb-6">
            Sẵn Sàng Để Bắt Đầu?
          </h2>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto mb-6 md:mb-8">
            Tham gia cộng đồng ngay hôm nay và bắt đầu kết nối với hàng ngàn người dùng khác
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="group px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-base transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tạo bài viết
              </span>
            </button>
            <Link
              href="/register"
              className="group px-8 py-4 bg-white/20 backdrop-blur-sm text-white border-2 border-white/50 rounded-2xl font-bold text-base transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:border-white/80"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Wave */}
      <div className="bg-slate-100">
        <svg viewBox="0 0 1440 80" className="w-full h-16 md:h-20 fill-slate-100">
          <path d="M0,80 C360,80 360,40 720,40 1440,80 L1440,80 Z" fill="white" />
        </svg>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
      />
    </div>
  );
}
