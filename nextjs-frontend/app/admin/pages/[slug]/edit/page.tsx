'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface StaticPageData {
  id?: number;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  is_default: boolean;
  updated_at: string | null;
}

export default function AdminEditStaticPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [pageData, setPageData] = useState<StaticPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';
        const token = localStorage.getItem('api_token');

        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${apiUrl}/admin/pages/${slug}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (response.status === 403) {
          setError('Bạn không có quyền truy cập trang này. Chỉ admin mới có thể chỉnh sửa.');
          setLoading(false);
          return;
        }

        const result = await response.json();

        if (result.success) {
          setPageData(result.data);
          setTitle(result.data.title);
          setContent(result.data.content);
          setMetaDescription(result.data.meta_description || '');
        } else {
          setError(result.message || 'Không thể tải nội dung trang');
        }
      } catch (err) {
        console.error('Error fetching page content:', err);
        setError('Không thể kết nối đến máy chủ');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPageContent();
    }
  }, [slug, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';
      const token = localStorage.getItem('api_token');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${apiUrl}/admin/pages/${slug}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          meta_description: metaDescription,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Đã lưu thành công!');
        setPageData(result.data);
      } else {
        setError(result.message || 'Không thể lưu nội dung');
      }
    } catch (err) {
      console.error('Error saving page content:', err);
      setError('Không thể kết nối đến máy chủ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !pageData) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Quay lại Trang quản trị
          </Link>
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <p className="text-red-500 text-center">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-medium">
                ← Quay lại Trang quản trị
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-4">
                Chỉnh sửa trang: {slug}
              </h1>
              {pageData?.is_default && (
                <p className="text-yellow-600 mt-2">
                  ⚠️ Đang sử dụng nội dung mặc định. Lưu để tạo nội dung tùy chỉnh.
                </p>
              )}
            </div>
            <Link
              href={`/${slug}`}
              target="_blank"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Xem trang →
            </Link>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề trang
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Meta Description */}
            <div>
              <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả SEO (meta description)
              </label>
              <input
                type="text"
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={500}
                placeholder="Mô tả ngắn gọn cho công cụ tìm kiếm..."
              />
              <p className="text-sm text-gray-500 mt-1">{metaDescription.length}/500 ký tự</p>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Nội dung HTML
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Nhập nội dung HTML trực tiếp. Hỗ trợ các thẻ HTML như &lt;section&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, v.v.
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Xem trước</h3>
            <div
              className="prose prose-lg max-w-none p-4 bg-gray-50 rounded-lg border border-gray-200"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>

          {/* Submit */}
          <div className="border-t border-gray-200 p-6 flex justify-end space-x-4">
            <Link
              href="/admin"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
