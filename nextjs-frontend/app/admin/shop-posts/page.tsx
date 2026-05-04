'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { admin, categories } from '@/lib/api';

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
}

interface ShopPost {
  id: number;
  title: string;
  content: string;
  short_description: string;
  status: string;
  type: string;
  product_type: string;
  price: number;
  sale_price: number;
  category_id?: number | null;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  shop: {
    id: number;
    name: string;
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

export default function AdminShopPostsPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<ShopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ShopPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    short_description: '',
    type: 'post',
    status: 'draft',
    product_type: 'simple',
    price: 0,
    sale_price: 0,
    category_id: null as number | null,
  });
  const [categoryList, setCategoryList] = useState<Category[]>([]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categories.adminGetAll({ per_page: 100 });
      setCategoryList(response.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  const fetchPosts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await admin.getShopPosts({
        search: searchQuery || undefined,
        status: statusFilter as 'draft' | 'published' | undefined,
        type: typeFilter as 'post' | 'page' | undefined,
        per_page: 15,
        page,
      });

      setPosts(response.data || []);
      if (response.meta) {
        setPagination({
          total: response.meta.total,
          per_page: response.meta.per_page,
          current_page: response.meta.current_page,
          last_page: response.meta.last_page,
        });
      }
    } catch (error) {
      console.error('Failed to fetch shop posts:', error);
      setMessage({ type: 'error', text: 'Không thể tải bài viết cửa hàng' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter]);

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
      fetchCategories();
    }
  }, [authLoading, isAuthenticated, currentUser, router, fetchPosts, fetchCategories]);

  const handleEdit = async () => {
    if (!selectedPost) return;
    try {
      await admin.updateShopPost(selectedPost.id, {
        title: formData.title,
        content: formData.content,
        short_description: formData.short_description,
        type: formData.type as 'post' | 'page',
        status: formData.status as 'draft' | 'published',
        product_type: formData.product_type as 'simple' | 'variant' | 'download',
        price: formData.price,
        sale_price: formData.sale_price,
        category_id: formData.category_id,
      });
      setMessage({ type: 'success', text: 'Cập nhật bài viết cửa hàng thành công' });
      setShowEditModal(false);
      setSelectedPost(null);
      resetForm();
      fetchPosts();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể cập nhật bài viết cửa hàng' });
    }
  };

  const handleDelete = async () => {
    if (!selectedPost) return;
    try {
      await admin.deleteShopPost(selectedPost.id);
      setMessage({ type: 'success', text: 'Xóa bài viết cửa hàng thành công' });
      setShowDeleteModal(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể xóa bài viết cửa hàng' });
    }
  };

  const openEditModal = (post: ShopPost) => {
    setSelectedPost(post);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      short_description: post.short_description || '',
      type: post.type || 'post',
      status: post.status || 'draft',
      product_type: post.product_type || 'simple',
      price: post.price || 0,
      sale_price: post.sale_price || 0,
      category_id: post.category_id || null,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (post: ShopPost) => {
    setSelectedPost(post);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      short_description: '',
      type: 'post',
      status: 'draft',
      product_type: 'simple',
      price: 0,
      sale_price: 0,
      category_id: null,
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quản lý bài viết cửa hàng</h1>
            <p className="text-sm md:text-base text-gray-600">Quản lý sản phẩm và bài viết từ tất cả các cửa hàng</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center px-3 py-2 md:px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors text-sm md:text-base"
          >
            <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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
        <div className="bg-white rounded-lg shadow-md p-3 md:p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="col-span-2 md:col-span-1 px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">Tất cả loại</option>
              <option value="post">Sản phẩm</option>
              <option value="page">Trang</option>
            </select>
            <button
              onClick={() => fetchPosts(1)}
              className="col-span-2 md:col-span-1 px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* Posts Table - Desktop */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hidden md:block">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Không tìm thấy bài viết cửa hàng nào</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiêu đề</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cửa hàng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
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
                          {post.title || '(Không có tiêu đề)'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {post.shop?.name || 'Cửa hàng không xác định'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                        {post.product_type || post.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {post.sale_price ? (
                          <div>
                            <span className="line-through text-gray-400 mr-2">{formatPrice(post.price)}</span>
                            <span className="text-red-600 font-medium">{formatPrice(post.sale_price)}</span>
                          </div>
                        ) : (
                          post.price ? formatPrice(post.price) : '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(post.status)}`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {post.created_at ? new Date(post.created_at).toLocaleDateString() : '-'}
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
          )}
        </div>

        {/* Posts Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">Không tìm thấy bài viết cửa hàng nào</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate flex-1 pr-2">
                    {post.title || '(Không có tiêu đề)'}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(post.status)}`}>
                    {post.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <p><span className="font-medium">Cửa hàng:</span> {post.shop?.name || 'Cửa hàng không xác định'}</p>
                  <p><span className="font-medium">Loại:</span> <span className="capitalize">{post.product_type || post.type}</span></p>
                  <p><span className="font-medium">Giá:</span> {post.sale_price ? (
                    <>
                      <span className="line-through text-gray-400 mr-1">{formatPrice(post.price)}</span>
                      <span className="text-red-600">{formatPrice(post.sale_price)}</span>
                    </>
                  ) : (
                    post.price ? formatPrice(post.price) : '-'
                  )}</p>
                  <p><span className="font-medium">Ngày:</span> {post.created_at ? new Date(post.created_at).toLocaleDateString() : '-'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(post)}
                    className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => openDeleteModal(post)}
                    className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-medium"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="mt-4 flex justify-center items-center gap-2">
            {/* Prev Button */}
            <button
              onClick={() => fetchPosts(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className={`px-3 py-1 rounded text-sm ${
                pagination.current_page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Trước
            </button>

            {/* Page Numbers - Hidden on mobile */}
            <div className="hidden sm:flex gap-2">
              {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchPosts(page)}
                  className={`px-3 py-1 rounded text-sm ${
                    page === pagination.current_page
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            {/* Page indicator - Mobile only */}
            <span className="sm:hidden text-sm text-gray-600">
              {pagination.current_page} / {pagination.last_page}
            </span>

            {/* Next Button */}
            <button
              onClick={() => fetchPosts(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className={`px-3 py-1 rounded text-sm ${
                pagination.current_page === pagination.last_page
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Sau
            </button>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4">Sửa bài viết cửa hàng</h2>
              <p className="text-gray-600 text-xs md:text-sm mb-4">Shop: {selectedPost.shop?.name}</p>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
                  <textarea
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Giá</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Giá khuyến mãi</label>
                    <input
                      type="number"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="">Không có danh mục</option>
                      {categoryList.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.parent_id ? '— ' : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Loại sản phẩm</label>
                    <select
                      value={formData.product_type}
                      onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="simple">Đơn giản</option>
                      <option value="variant">Biến thể</option>
                      <option value="download">Tải xuống</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Loại</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="post">Sản phẩm</option>
                      <option value="page">Trang</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="draft">Bản nháp</option>
                      <option value="published">Đã xuất bản</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => { setShowEditModal(false); setSelectedPost(null); }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base"
                >
                  Hủy
                </button>
                <button
                  onClick={handleEdit}
                  className="w-full sm:w-auto px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm md:text-base"
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
              <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4 text-red-600">Xóa bài viết cửa hàng</h2>
              <p className="text-sm md:text-base text-gray-600 mb-4">
                Bạn có chắc chắn muốn xóa <strong>{selectedPost.title || '(Không có tiêu đề)'}</strong> khỏi <strong>{selectedPost.shop?.name}</strong>? Hành động này không thể hoàn tác.
              </p>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => { setShowDeleteModal(false); setSelectedPost(null); }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full sm:w-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm md:text-base"
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
