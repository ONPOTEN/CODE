'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

export default function AdminDashboardPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!authLoading && !isAdmin(currentUser)) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, authLoading, currentUser, router]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin(currentUser)) {
    return null;
  }

  const adminSections = [
    {
      title: 'Quản lý người dùng',
      description: 'Tạo, sửa, xóa người dùng và quản lý vai trò',
      href: '/admin/users',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
    },
    {
      title: 'Quản lý cửa hàng',
      description: 'Duyệt hoặc từ chối đơn đăng ký cửa hàng',
      href: '/admin/shops',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-green-500',
    },
    {
      title: 'Quản lý bài viết',
      description: 'Tạo, sửa, xóa bài viết trên tường',
      href: '/admin/posts',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-purple-500',
    },
    {
      title: 'Quản lý bài viết nhóm',
      description: 'Tạo, sửa, xóa bài viết trong nhóm',
      href: '/admin/group-posts',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-orange-500',
    },
    {
      title: 'Quản lý sản phẩm cửa hàng',
      description: 'Tạo, sửa, xóa sản phẩm/bài viết cửa hàng',
      href: '/admin/shop-posts',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'bg-pink-500',
    },
    {
      title: 'Quản lý danh mục',
      description: 'Quản lý danh mục với cấu trúc cha/con',
      href: '/admin/categories',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: 'bg-teal-500',
    },
    {
      title: 'Quản lý trang tĩnh',
      description: 'Chỉnh sửa Điều khoản, Điều kiện, Chính sách bảo mật',
      href: '/admin/pages',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      color: 'bg-indigo-500',
    },
    {
      title: 'Cài đặt hệ thống',
      description: 'Cấu hình kích thước hình ảnh và các cài đặt khác',
      href: '/admin/settings',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-gray-500',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển quản trị</h1>
              <p className="text-gray-600 mt-2">Xin chào, {currentUser?.display_name || currentUser?.username}</p>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại hồ sơ
            </Link>
          </div>
        </div>

        {/* Admin Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
            >
              <div className="flex items-start gap-4">
                <div className={`${section.color} text-white p-3 rounded-lg`}>
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{section.title}</h2>
                  <p className="text-gray-600">{section.description}</p>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/admin/users?action=create"
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Tạo người dùng mới
            </Link>
            <Link
              href="/admin/shops"
              className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Duyệt cửa hàng đang chờ
            </Link>
            <Link
              href="/admin/pages/dieu-kien/edit"
              className="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Sửa Điều khoản và Điều kiện
            </Link>
            <Link
              href="/admin/pages/dieu-khoan/edit"
              className="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Sửa Điều khoản Dịch vụ
            </Link>
          </div>
        </div>

        {/* Static Pages Quick Links */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trang tĩnh</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Điều khoản và Điều kiện</h4>
                <p className="text-sm text-gray-500">/dieu-kien</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/dieu-kien"
                  target="_blank"
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Xem
                </Link>
                <Link
                  href="/admin/pages/dieu-kien/edit"
                  className="px-3 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Sửa
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Điều khoản Dịch vụ</h4>
                <p className="text-sm text-gray-500">/dieu-khoan</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/dieu-khoan"
                  target="_blank"
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Xem
                </Link>
                <Link
                  href="/admin/pages/dieu-khoan/edit"
                  className="px-3 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Sửa
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Chính sách Bảo mật</h4>
                <p className="text-sm text-gray-500">/chinh-sach-bao-mat</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/chinh-sach-bao-mat"
                  target="_blank"
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Xem
                </Link>
                <Link
                  href="/admin/pages/chinh-sach-bao-mat/edit"
                  className="px-3 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Sửa
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Xóa Dữ liệu Người dùng</h4>
                <p className="text-sm text-gray-500">/xoa-du-lieu-nguoi-dung</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/xoa-du-lieu-nguoi-dung"
                  target="_blank"
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Xem
                </Link>
                <Link
                  href="/admin/pages/xoa-du-lieu-nguoi-dung/edit"
                  className="px-3 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Sửa
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Chính sách Bán hàng</h4>
                <p className="text-sm text-gray-500">/chinh-sach-ban-hang-mua-hang</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/chinh-sach-ban-hang-mua-hang"
                  target="_blank"
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Xem
                </Link>
                <Link
                  href="/admin/pages/chinh-sach-ban-hang-mua-hang/edit"
                  className="px-3 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Sửa
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Điều khoản và Điều kiện</h4>
                <p className="text-sm text-gray-500">/dieu-khoan-dieu-kien</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/dieu-khoan-dieu-kien"
                  target="_blank"
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Xem
                </Link>
                <Link
                  href="/admin/pages/dieu-khoan-dieu-kien/edit"
                  className="px-3 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Sửa
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-900 font-semibold mb-2">Quyền quản trị</h3>
          <p className="text-blue-800 text-sm">
            Bạn có quyền quản trị viên. Quyền lực lớn đi kèm trách nhiệm lớn.
            Tất cả các hành động đều được ghi lại vì mục đích bảo mật.
          </p>
        </div>
      </div>
    </div>
  );
}
