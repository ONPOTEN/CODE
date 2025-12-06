'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { posts, Post, ApiException } from '@/lib/api';

export default function MyPostsPage() {
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    async function fetchMyPosts() {
      try {
        setIsLoading(true);
        setError(null);

        const params: any = { per_page: 50 };
        if (filterStatus) params.status = filterStatus;
        if (filterType) params.type = filterType;

        const response = await posts.myPosts(params);
        setPostsList(response.data);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`Lỗi: ${err.message}`);
        } else {
          setError('Không thể tải bài viết');
        }
        console.error('Fetch posts error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && isAuthenticated) {
      fetchMyPosts();
    }
  }, [authLoading, isAuthenticated, filterStatus, filterType]);

  const handleDelete = async (postId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      setDeleteLoading(postId);
      await posts.delete(postId);
      setPostsList(postsList.filter((post) => post.id !== postId));
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Xóa thất bại: ${err.message}`);
      } else {
        alert('Xóa bài viết thất bại');
      }
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Bài viết của tôi</h1>
          <Link
            href="/posts/create"
            className="bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
          >
            Tạo bài viết mới
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-grey-200 rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-2">
                Lọc theo trạng thái
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="publish">Đã đăng</option>
                <option value="draft">Bản nháp</option>
                <option value="pending">Chờ duyệt</option>
              </select>
            </div>

            <div>
              <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-2">
                Lọc theo loại
              </label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả loại</option>
                <option value="post">Bài viết</option>
                <option value="page">Trang</option>
                <option value="product">Sản phẩm</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-blue-500 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {postsList.length === 0 ? (
          <div className="bg-grey-200 rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">Bạn chưa tạo bài viết nào.</p>
            <Link
              href="/posts/create"
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Tạo bài viết đầu tiên
            </Link>
          </div>
        ) : (
          <div className="bg-grey-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-grey-200 divide-y divide-gray-200">
                  {postsList.map((post) => (
                    <tr key={post.id} className="hover:bg-white">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {post.featured_image && (
                            <img
                              src={post.featured_image}
                              alt={post.title}
                              className="w-12 h-12 object-cover rounded mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{post.title}</div>
                            {post.excerpt && (
                              <div className="text-sm text-gray-500 truncate max-w-md">
                                {post.excerpt}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500 text-blue-800">
                          {post.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            post.status === 'publish'
                              ? 'bg-blue-500 text-green-800'
                              : post.status === 'draft'
                              ? 'bg-blue-500 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/posts/edit/${post.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deleteLoading === post.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deleteLoading === post.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Tổng cộng: {postsList.length} bài viết
        </div>
      </div>
    </div>
  );
}
