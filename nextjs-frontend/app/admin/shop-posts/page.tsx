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
      setMessage({ type: 'error', text: 'Failed to load shop posts' });
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
      setMessage({ type: 'success', text: 'Shop post updated successfully' });
      setShowEditModal(false);
      setSelectedPost(null);
      resetForm();
      fetchPosts();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update shop post' });
    }
  };

  const handleDelete = async () => {
    if (!selectedPost) return;
    try {
      await admin.deleteShopPost(selectedPost.id);
      setMessage({ type: 'success', text: 'Shop post deleted successfully' });
      setShowDeleteModal(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete shop post' });
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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Shop Post Management</h1>
            <p className="text-sm md:text-base text-gray-600">Manage products and posts from all shops</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center px-3 py-2 md:px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors text-sm md:text-base"
          >
            <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden md:inline">Back to Admin</span>
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
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="col-span-2 md:col-span-1 px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="post">Product</option>
              <option value="page">Page</option>
            </select>
            <button
              onClick={() => fetchPosts(1)}
              className="col-span-2 md:col-span-1 px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
            >
              Search
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
            <div className="text-center py-20 text-gray-500">No shop posts found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {post.title || '(No title)'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {post.shop?.name || 'Unknown Shop'}
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
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(post)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
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
            <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">No shop posts found</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate flex-1 pr-2">
                    {post.title || '(No title)'}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(post.status)}`}>
                    {post.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <p><span className="font-medium">Shop:</span> {post.shop?.name || 'Unknown Shop'}</p>
                  <p><span className="font-medium">Type:</span> <span className="capitalize">{post.product_type || post.type}</span></p>
                  <p><span className="font-medium">Price:</span> {post.sale_price ? (
                    <>
                      <span className="line-through text-gray-400 mr-1">{formatPrice(post.price)}</span>
                      <span className="text-red-600">{formatPrice(post.sale_price)}</span>
                    </>
                  ) : (
                    post.price ? formatPrice(post.price) : '-'
                  )}</p>
                  <p><span className="font-medium">Date:</span> {post.created_at ? new Date(post.created_at).toLocaleDateString() : '-'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(post)}
                    className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(post)}
                    className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-medium"
                  >
                    Delete
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
              Prev
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
              Next
            </button>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4">Edit Shop Post</h2>
              <p className="text-gray-600 text-xs md:text-sm mb-4">Shop: {selectedPost.shop?.name}</p>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Short Description</label>
                  <textarea
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Price</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Sale Price</label>
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
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="">No Category</option>
                      {categoryList.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.parent_id ? '— ' : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Product Type</label>
                    <select
                      value={formData.product_type}
                      onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="simple">Simple</option>
                      <option value="variant">Variant</option>
                      <option value="download">Download</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="post">Product</option>
                      <option value="page">Page</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => { setShowEditModal(false); setSelectedPost(null); }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  className="w-full sm:w-auto px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm md:text-base"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
              <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4 text-red-600">Delete Shop Post</h2>
              <p className="text-sm md:text-base text-gray-600 mb-4">
                Are you sure you want to delete <strong>{selectedPost.title || '(No title)'}</strong> from <strong>{selectedPost.shop?.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => { setShowDeleteModal(false); setSelectedPost(null); }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full sm:w-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm md:text-base"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
