'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface StaticPageItem {
  id: number | null;
  slug: string;
  title: string;
  meta_description: string;
  updated_at: string | null;
  is_default?: boolean;
}

export default function AdminStaticPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<StaticPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';
        const token = localStorage.getItem('api_token');

        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${apiUrl}/admin/pages`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (response.status === 403) {
          setError('Bạn không có quyền truy cập trang này. Chỉ admin mới có thể xem.');
          setLoading(false);
          return;
        }

        const result = await response.json();

        if (result.success) {
          setPages(result.data);
        } else {
          setError(result.message || 'Không thể tải danh sách trang');
        }
      } catch (err) {
        console.error('Error fetching pages:', err);
        setError('Không thể kết nối đến máy chủ');
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Quay lại Trang quản trị
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Quản lý trang tĩnh
          </h1>
          <p className="text-gray-600 mt-2">
            Chỉnh sửa nội dung các trang như Điều khoản, Điều kiện, Chính sách bảo mật...
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Pages List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cập nhật lần cuối
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page.slug} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{page.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {page.meta_description || 'Chưa có mô tả'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">/{page.slug}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {page.is_default ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Mặc định
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Tùy chỉnh
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.updated_at
                      ? new Date(page.updated_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Chưa chỉnh sửa'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link
                      href={`/${page.slug}`}
                      target="_blank"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Xem
                    </Link>
                    <Link
                      href={`/admin/pages/${page.slug}/edit`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Sửa
                    </Link>
                  </td>
                </tr>
              ))}
              {pages.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Không có trang nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
