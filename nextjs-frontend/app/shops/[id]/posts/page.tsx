'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { shopPosts, shops, type ShopPost, type Shop } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleProductsList } from './SimpleProductsList';
import { VariantProductsList } from './VariantProductsList';
import { DownloadProductsList } from './DownloadProductsList';

export default function ShopPostsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const shopId = Number(params.id);

  const [shop, setShop] = useState<Shop | null>(null);
  const [posts, setPosts] = useState<ShopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'post' | 'page'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [productTypeView, setProductTypeView] = useState<'all' | 'simple' | 'variant' | 'download'>('all');

  const isOwner = user && shop && shop.user_id === user.id;

  useEffect(() => {
    fetchShopAndPosts();
  }, [shopId, filter, statusFilter]);

  const fetchShopAndPosts = async () => {
    try {
      setLoading(true);
      const [shopData, postsData] = await Promise.all([
        shops.getById(shopId),
        shopPosts.getAll(shopId, {
          type: filter !== 'all' ? filter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
      ]);
      setShop(shopData);
      setPosts(postsData.data || []);
    } catch (error) {
      console.error('Lỗi khi lấy bài viết cửa hàng:', error);
      alert('Không thể tải bài viết cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: number, postTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${postTitle}" không?`)) {
      return;
    }

    try {
      await shopPosts.delete(shopId, postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      alert('Đã xóa bài viết thành công!');
    } catch (error) {
      console.error('Lỗi khi xóa bài viết:', error);
      alert('Không thể xóa bài viết');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Đang tải...</div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600">Không tìm thấy cửa hàng</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-grey-200 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{shop.name}</h1>
              <p className="text-gray-600 mt-2">Quản lý bài viết và trang của cửa hàng</p>
            </div>
            {isOwner && (
              <button
                onClick={() => router.push(`/shops/${shopId}/posts/create`)}
                className="bg-blue-500 text-gray-900 px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tạo bài viết/Trang mới
              </button>
            )}
          </div>

          {/* Product Type View Tabs */}
          <div className="px-4 md:px-6 pt-4 pb-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setProductTypeView('all')}
                className={`relative px-4 py-2.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 ${
                  productTypeView === 'all'
                    ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📋</span>
                  <span>Tất cả</span>
                </span>
                {productTypeView === 'all' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setProductTypeView('simple')}
                className={`relative px-4 py-2.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 ${
                  productTypeView === 'simple'
                    ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🛍️</span>
                  <span>Đơn giản</span>
                </span>
                {productTypeView === 'simple' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setProductTypeView('variant')}
                className={`relative px-4 py-2.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 ${
                  productTypeView === 'variant'
                    ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🎨</span>
                  <span>Biến thể</span>
                </span>
                {productTypeView === 'variant' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setProductTypeView('download')}
                className={`relative px-4 py-2.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 ${
                  productTypeView === 'download'
                    ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📥</span>
                  <span>Tải xuống</span>
                </span>
                {productTypeView === 'download' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Loại:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'post' | 'page')}
                className="border border-gray-300 rounded-md px-3 py-1"
              >
                <option value="all">Tất cả</option>
                <option value="post">Bài viết</option>
                <option value="page">Trang</option>
              </select>
            </div>

            {isOwner && (
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Trạng thái:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
                  className="border border-gray-300 rounded-md px-3 py-1"
                >
                  <option value="all">Tất cả</option>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Posts/Products View Based on productTypeView */}
        {productTypeView === 'simple' && <SimpleProductsList shopId={shopId} />}

        {productTypeView === 'variant' && <VariantProductsList shopId={shopId} />}

        {productTypeView === 'download' && <DownloadProductsList shopId={shopId} />}

        {/* Default view - All Posts List */}
        {productTypeView === 'all' && (
          <>
            {posts.length === 0 ? (
              <div className="bg-grey-200 rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-500 text-lg">Không tìm thấy bài viết</p>
                {isOwner && (
                  <button
                    onClick={() => router.push(`/shops/${shopId}/posts/create`)}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Tạo bài viết đầu tiên
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-grey-200 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
                        </div>

                        {post.content && (
                          <p className="text-gray-600 mb-3 line-clamp-2">
                            {post.content.substring(0, 150)}
                            {post.content.length > 150 ? '...' : ''}
                          </p>
                        )}

                      </div>

                      {isOwner && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => router.push(`/shops/${shopId}/posts/${post.id}/edit`)}
                            className="px-4 py-2 text-blue-600 hover:bg-grey-200 rounded-md transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(post.id, post.title)}
                            className="px-4 py-2 text-red-600 hover:bg-grey-200 rounded-md transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
