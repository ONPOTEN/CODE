'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { categories, Category, CreateCategoryData, UpdateCategoryData } from '@/lib/api';

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function AdminCategoriesPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]); // For parent selection
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentFilter, setParentFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CreateCategoryData>({
    name: '',
    slug: '',
    description: '',
    parent_id: null,
    order: 0,
    is_active: true,
  });
  const [slugManual, setSlugManual] = useState(false);

  // Fetch categories with filters
  const fetchCategories = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await categories.adminGetAll({
        search: searchQuery || undefined,
        parent_id: parentFilter || undefined,
        is_active: activeFilter === '' ? undefined : activeFilter === 'true',
        per_page: 20,
        page,
      });

      setCategoryList(response.data || []);
      if (response.meta) {
        setPagination({
          total: response.meta.total,
          per_page: response.meta.per_page,
          current_page: response.meta.current_page,
          last_page: response.meta.last_page,
        });
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setMessage({ type: 'error', text: 'Không thể tải danh mục' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, parentFilter, activeFilter]);

  // Fetch all categories for parent selection dropdown
  const fetchAllCategories = useCallback(async () => {
    try {
      const response = await categories.adminGetAll({ per_page: 100 });
      setAllCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch all categories:', error);
    }
  }, []);

  // Auto-generate slug when name changes (if not manually edited)
  const handleNameChange = async (name: string) => {
    setFormData({ ...formData, name });
    if (!slugManual && name.trim()) {
      try {
        const response = await categories.generateSlug(name, selectedCategory?.id);
        setFormData((prev) => ({ ...prev, name, slug: response.slug }));
      } catch (error) {
        console.error('Failed to generate slug:', error);
      }
    }
  };

  // Handle slug manual edit
  const handleSlugChange = (slug: string) => {
    setSlugManual(true);
    setFormData({ ...formData, slug });
  };

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!authLoading && !isAdmin(currentUser)) {
      router.push('/');
      return;
    }
  }, [authLoading, isAuthenticated, currentUser, router]);

  // Load categories
  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin(currentUser)) {
      fetchCategories();
      fetchAllCategories();
    }
  }, [authLoading, isAuthenticated, currentUser, fetchCategories, fetchAllCategories]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      parent_id: null,
      order: 0,
      is_active: true,
    });
    setSlugManual(false);
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id,
      order: category.order,
      is_active: category.is_active,
    });
    setSlugManual(true);
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  // Handle create
  const handleCreate = async () => {
    try {
      const response = await categories.create(formData);
      setMessage({ type: 'success', text: response.message || 'Tạo danh mục thành công' });
      setShowCreateModal(false);
      fetchCategories();
      fetchAllCategories();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể tạo danh mục' });
    }
  };

  // Handle update
  const handleUpdate = async () => {
    if (!selectedCategory) return;
    try {
      const response = await categories.update(selectedCategory.id, formData);
      setMessage({ type: 'success', text: response.message || 'Cập nhật danh mục thành công' });
      setShowEditModal(false);
      setSelectedCategory(null);
      fetchCategories();
      fetchAllCategories();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể cập nhật danh mục' });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      const response = await categories.delete(selectedCategory.id);
      setMessage({ type: 'success', text: response.message || 'Xóa danh mục thành công' });
      setShowDeleteModal(false);
      setSelectedCategory(null);
      fetchCategories();
      fetchAllCategories();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Không thể xóa danh mục' });
    }
  };

  // Get parent category name
  const getParentName = (parentId: number | null | undefined) => {
    if (!parentId) return '—';
    const parent = allCategories.find((c) => c.id === parentId);
    return parent?.name || `ID: ${parentId}`;
  };

  // Loading state
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quản lý danh mục</h1>
            <p className="text-sm md:text-base text-gray-600">Quản lý danh mục với cấu trúc phân cấp</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center px-3 py-2 md:px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
            >
              <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden md:inline">Thêm danh mục</span>
            </button>
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
              className="col-span-2 md:col-span-1 px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
              className="px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả danh mục cha</option>
              <option value="null">Danh mục gốc</option>
              {allCategories.filter((c) => !c.parent_id).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="false">Ngừng hoạt động</option>
            </select>
            <button
              onClick={() => fetchCategories(1)}
              className="col-span-2 md:col-span-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* Categories Table - Desktop */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hidden md:block">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : categoryList.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Không tìm thấy danh mục</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục cha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thứ tự</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryList.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{cat.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{cat.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{cat.slug}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{getParentName(cat.parent_id)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cat.order}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cat.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {cat.is_active ? 'Hoạt động' : 'Ngừng'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => openDeleteModal(cat)}
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

        {/* Categories Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : categoryList.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">Không tìm thấy danh mục</div>
          ) : (
            categoryList.map((cat) => (
              <div key={cat.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{cat.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{cat.slug}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cat.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {cat.is_active ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <p><span className="font-medium">Danh mục cha:</span> {getParentName(cat.parent_id)}</p>
                  <p><span className="font-medium">Thứ tự:</span> {cat.order}</p>
                  {cat.description && <p><span className="font-medium">Mô tả:</span> {cat.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => openDeleteModal(cat)}
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
            <button
              onClick={() => fetchCategories(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className={`px-3 py-1 rounded text-sm ${
                pagination.current_page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Trước
            </button>
            <div className="hidden sm:flex gap-2">
              {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchCategories(page)}
                  className={`px-3 py-1 rounded text-sm ${
                    page === pagination.current_page
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <span className="sm:hidden text-sm text-gray-600">
              {pagination.current_page} / {pagination.last_page}
            </span>
            <button
              onClick={() => fetchCategories(pagination.current_page + 1)}
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

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold mb-4">Tạo danh mục</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tên danh mục"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đường dẫn</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="duong-dan (tự động tạo)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Để trống để tự động tạo từ tên</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Mô tả danh mục (không bắt buộc)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục cha</label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Không có (Danh mục gốc)</option>
                    {allCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.parent_id ? `— ${cat.name}` : cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="true">Hoạt động</option>
                      <option value="false">Ngừng hoạt động</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!formData.name.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tạo danh mục
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold mb-4">Sửa danh mục</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tên danh mục"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đường dẫn</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="duong-dan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Mô tả danh mục (không bắt buộc)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục cha</label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Không có (Danh mục gốc)</option>
                    {allCategories
                      .filter((cat) => cat.id !== selectedCategory.id) // Exclude self
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.parent_id ? `— ${cat.name}` : cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="true">Hoạt động</option>
                      <option value="false">Ngừng hoạt động</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => { setShowEditModal(false); setSelectedCategory(null); }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={!formData.name.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
              <h2 className="text-lg md:text-xl font-bold mb-4 text-red-600">Xóa danh mục</h2>
              <p className="text-sm md:text-base text-gray-600 mb-4">
                Bạn có chắc chắn muốn xóa <strong>{selectedCategory.name}</strong>? Hành động này không thể hoàn tác.
              </p>
              {selectedCategory.children && selectedCategory.children.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Cảnh báo: Danh mục này có danh mục con. Bạn phải xóa hoặc di chuyển chúng trước.
                  </p>
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => { setShowDeleteModal(false); setSelectedCategory(null); }}
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
