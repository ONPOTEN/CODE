'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

interface StaticPageData {
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  is_default: boolean;
  updated_at: string | null;
}

export default function ChinhSachBanHangMuaHangPage() {
  const { user } = useAuth();
  const [pageData, setPageData] = useState<StaticPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';
        const response = await fetch(`${apiUrl}/pages/chinh-sach-ban-hang-mua-hang`);
        const result = await response.json();

        if (result.success) {
          setPageData(result.data);
        } else {
          setError('Không thể tải nội dung trang');
        }
      } catch (err) {
        console.error('Error fetching page content:', err);
        setError('Không thể kết nối đến máy chủ');
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Quay lại Trang chủ
          </Link>
          <div className="mt-8 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Quay lại Trang chủ
            </Link>
            {isAdmin(user) && (
              <Link
                href="/admin/pages/chinh-sach-ban-hang-mua-hang/edit"
                className="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Chỉnh sửa trang
              </Link>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            {pageData?.title || 'Chính sách Bán hàng & Mua hàng'}
          </h1>
          <p className="text-gray-600 mt-2">
            Cập nhật lần cuối: {pageData?.updated_at
              ? new Date(pageData.updated_at).toLocaleDateString('vi-VN')
              : new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: pageData?.content || '' }}
        />

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-500 text-sm text-center">
            &copy; {new Date().getFullYear()} Centimet2. Tất cả các quyền được bảo lưu.
          </p>
        </div>
      </div>
    </div>
  );
}
