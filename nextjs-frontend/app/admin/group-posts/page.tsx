'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { admin } from '@/lib/api';

interface GroupPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  status: string;
  type: string;
  visibility: string;
  group: {
    group_id: number;
    group_name: string;
  };
  author: {
    id: number;
    name: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export default function AdminGroupPostsPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<GroupPost | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    excerpt: string;
    type: 'post' | 'page';
    status: 'pending' | 'publish' | 'draft' | 'trash';
    visibility: 'public' | 'private';
  }>({
    title: '',
    content: '',
    excerpt: '',
    type: 'post',
    status: 'publish',
    visibility: 'public',
  });

  const fetchPosts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await admin.getGroupPosts({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        per_page: 15,
        page,
      });

      setPosts(response.data || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch group posts:', error);
      setMessage({ type: 'error', text: 'Không thể tải bài viết nhóm' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!authLoading && !isAdmin(currentUser)) {
      router.push('/');
      return;
    }
    if (!authLoading && isAdmin(currentUser)) {
      fetchPosts();
    }
  }, [authLoading, isAuthenticated, currentUser, router, fetchPosts]);

  const handleEdit = async () => {
    if (!selectedPost) return;
    try {
      await admin.updateGroupPost(selectedPost.id, formData);
      setMessage({ type: 'success', text: 'Cập nhật bài viết nhóm thành công' });
      setShowEditModal(false);
      setSelectedPost(null);
      resetForm();
      fetchPosts();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể cập nhật bài viết nhóm' });
    }
  };

  const handleDelete = async () => {
    if (!selectedPost) return;
    try {
      await admin.deleteGroupPost(selectedPost.id);
      setMessage({ type: 'success', text: 'Xóa bài viết nhóm thành công' });
      setShowDeleteModal(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể xóa bài viết nhóm' });
    }
  };

  const openEditModal = (post: GroupPost) => {
    setSelectedPost(post);
    setFormData({
      title: (post as any).post_title || post.title || '',
      content: (post as any).post_content || post.content || '',
      excerpt: (post as any).post_excerpt || post.excerpt || '',
      type: ((post as any).post_type || post.type || 'post') as 'post' | 'page',
      status: ((post as any).post_status || post.status || 'publish') as 'pending' | 'publish' | 'draft' | 'trash',
      visibility: (post.visibility || 'public') as 'public' | 'private',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (post: GroupPost) => {
    setSelectedPost(post);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      type: 'post',
      status: 'publish',
      visibility: 'public',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'publish':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'trash':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin(currentUser)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quản lý bài viết nhóm</h1>
            <p className="text-gray-600 text-sm md:text-base">Quản lý bài viết từ tất cả các nhóm</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center px-3 py-2 md:px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors text-sm md:text-base"
          >
            <svg className="w-5 h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden md:inline">Quay lại quản trị</span>
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm bài viết nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="col-span-2 md:col-span-1 px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="publish">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
              <option value="pending">Chờ duyệt</option>
              <option value="trash">Thùng rác</option>
            </select>
            <button
              onClick={() => fetchPosts(1)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Không tìm thấy bài viết nhóm nào</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiêu đề</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhóm</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tác giả</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {(post as any).post_title || post.title || '(Không có tiêu đề)'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {post.group?.group_name || 'Nhóm không xác định'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {post.author?.name || post.author?.username || 'Không xác định'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass((post as any).post_status || post.status)}`}>
                            {(post as any).post_status || post.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {(post as any).post_date ? new Date((post as any).post_date).toLocaleDateString() : (post.created_at ? new Date(post.created_at).toLocaleDateString() : '-')}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(post)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => openDeleteModal(post)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {posts.map((post) => (
                  <div key={post.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {(post as any).post_title || post.title || '(Không có tiêu đề)'}
                        </h3>
                        <p className="text-xs text-orange-600 mt-1 truncate">
                          {post.group?.group_name || 'Nhóm không xác định'}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass((post as any).post_status || post.status)}`}>
                        {(post as any).post_status || post.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span>Bởi {post.author?.name || post.author?.username || 'Không xác định'}</span>
                      <span>•</span>
                      <span>{(post as any).post_date ? new Date((post as any).post_date).toLocaleDateString() : (post.created_at ? new Date(post.created_at).toLocaleDateString() : '-')}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openEditModal(post)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => openDeleteModal(post)}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => fetchPosts(Math.max(1, pagination.current_page - 1))}
                disabled={pagination.current_page === 1}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Trang {pagination.current_page} / {pagination.last_page}
              </span>
              <button
                onClick={() => fetchPosts(Math.min(pagination.last_page, pagination.current_page + 1))}
                disabled={pagination.current_page === pagination.last_page}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold mb-2">Sửa bài viết nhóm</h2>
              <p className="text-orange-600 text-sm mb-4">{selectedPost.group?.group_name}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'publish' | 'draft' | 'trash' })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="draft">Bản nháp</option>
                      <option value="publish">Xuất bản</option>
                      <option value="pending">Chờ duyệt</option>
                      <option value="trash">Thùng rác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hiển thị</label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'private' })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="public">Công khai</option>
                      <option value="private">Riêng tư</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => { setShowEditModal(false); setSelectedPost(null); }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base"
                >
                  Hủy
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm md:text-base"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
              <h2 className="text-lg md:text-xl font-bold mb-4 text-red-600">Xóa bài viết nhóm</h2>
              <p className="text-gray-600 mb-4 text-sm md:text-base">
                Bạn có chắc chắn muốn xóa <strong>{(selectedPost as any).post_title || selectedPost.title || '(Không có tiêu đề)'}</strong> khỏi <strong>{selectedPost.group?.group_name}</strong>? Hành động này không thể hoàn tác.
              </p>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => { setShowDeleteModal(false); setSelectedPost(null); }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm md:text-base"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
