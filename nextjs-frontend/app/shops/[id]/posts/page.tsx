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
      console.error('Error fetching shop posts:', error);
      alert('Failed to load shop posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: number, postTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${postTitle}"?`)) {
      return;
    }

    try {
      await shopPosts.delete(shopId, postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      alert('Post deleted successfully!');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600">Shop not found</div>
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
              <p className="text-gray-600 mt-2">Manage your shop posts and pages</p>
            </div>
            {isOwner && (
              <button
                onClick={() => router.push(`/shops/${shopId}/posts/create`)}
                className="bg-blue-500 text-gray-900 px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create New Post/Page
              </button>
            )}
          </div>

          {/* Product Type View Tabs */}
          <div className="flex gap-2 mt-6 border-b border-gray-300 pb-4">
            <button
              onClick={() => setProductTypeView('all')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                productTypeView === 'all'
                  ? 'bg-blue-500 text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => setProductTypeView('simple')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                productTypeView === 'simple'
                  ? 'bg-grey-200 text-blue-900 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🛍️ Simple
            </button>
            <button
              onClick={() => setProductTypeView('variant')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                productTypeView === 'variant'
                  ? 'bg-grey-200 text-purple-900 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎨 Variant
            </button>
            <button
              onClick={() => setProductTypeView('download')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                productTypeView === 'download'
                  ? 'bg-grey-200 text-green-900 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📥 Download
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'post' | 'page')}
                className="border border-gray-300 rounded-md px-3 py-1"
              >
                <option value="all">All</option>
                <option value="post">Posts</option>
                <option value="page">Pages</option>
              </select>
            </div>

            {isOwner && (
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
                  className="border border-gray-300 rounded-md px-3 py-1"
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
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
                <p className="text-gray-500 text-lg">No posts found</p>
                {isOwner && (
                  <button
                    onClick={() => router.push(`/shops/${shopId}/posts/create`)}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first post
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
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500 text-blue-800">
                            {post.type}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              post.status === 'published'
                                ? 'bg-blue-500 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {post.status}
                          </span>
                        </div>

                        {post.content && (
                          <p className="text-gray-600 mb-3 line-clamp-2">
                            {post.content.substring(0, 150)}
                            {post.content.length > 150 ? '...' : ''}
                          </p>
                        )}

                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>Views: {post.view_count}</span>
                          <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                          {post.author && <span>By: {post.author.name || post.author.username}</span>}
                        </div>
                      </div>

                      {isOwner && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => router.push(`/shops/${shopId}/posts/${post.id}/edit`)}
                            className="px-4 py-2 text-blue-600 hover:bg-grey-200 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(post.id, post.title)}
                            className="px-4 py-2 text-red-600 hover:bg-grey-200 rounded-md transition-colors"
                          >
                            Delete
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
