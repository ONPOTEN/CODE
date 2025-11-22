'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { shopPosts, type ShopPost } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const shopId = Number(params.id);
  const postId = Number(params.postId);

  const [post, setPost] = useState<ShopPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showAddedNotification, setShowAddedNotification] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [postId, shopId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await shopPosts.getById(shopId, postId);
      let postData = response && typeof response === 'object' && 'id' in response ? response : (response as any)?.data;

      if (!postData) {
        throw new Error('Post not found');
      }

      setPost(postData);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!post) return;

    const price = parseFloat((post as any).price) || 0;
    const image = (post as any).main_image || post.featured_images?.[0] || '/placeholder.png';

    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: Math.random(),
        postId: post.id,
        shopId,
        title: post.title,
        price: price > 0 ? price : 0,
        image,
        product_type: post.product_type || 'unknown',
        type: post.type,
      });
    }

    setShowAddedNotification(true);
    setTimeout(() => setShowAddedNotification(false), 3000);
    setQuantity(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <Link
            href={`/shops/${shopId}`}
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && post.user_id === user.id;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-grey-200 border-b border-gray-300 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/shops/${shopId}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-semibold transition-colors whitespace-nowrap shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Go to Cart
            </Link>
            {isOwner && (
              <Link
                href={`/shops/${shopId}/posts/${postId}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-grey-200 rounded-lg shadow-md p-8 space-y-8">
          {/* Title and Badges */}
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h1 className="text-4xl font-bold text-gray-900">{post.title}</h1>
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
                post.type === 'post' ? 'bg-blue-500 text-blue-800' : 'bg-blue-500 text-purple-800'
              }`}>
                {post.type.toUpperCase()}
              </span>
              {post.product_type && (
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
                  post.product_type === 'Đơn giản'
                    ? 'bg-blue-500 text-blue-800'
                    : post.product_type === 'Biến thể'
                    ? 'bg-blue-500 text-purple-800'
                    : 'bg-blue-500 text-green-800'
                }`}>
                  {post.product_type}
                </span>
              )}
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
                post.status === 'published'
                  ? 'bg-blue-500 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {post.status.toUpperCase()}
              </span>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-6 text-sm text-gray-600 py-4 border-t border-b border-gray-300">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {post.view_count} views
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              {post.author && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {post.author.name || post.author.username}
                </span>
              )}
            </div>
          </div>

          {/* Main Image */}
          {(post as any).main_image && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={(post as any).main_image}
                alt={post.title}
                className="w-full h-auto max-h-96 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => window.open((post as any).main_image, '_blank')}
              />
            </div>
          )}

          {/* Other Images Gallery */}
          {(post as any).other_images && (post as any).other_images.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(post as any).other_images.map((imagePath: string, index: number) => (
                  <img
                    key={index}
                    src={imagePath}
                    alt={`${post.title} - Image ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => window.open(imagePath, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Featured Images Gallery */}
          {post.featured_images && post.featured_images.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Featured Images</h3>
              {post.featured_images.length === 1 ? (
                <img
                  src={post.featured_images && post.featured_images[0]}
                  alt={post.title}
                  className="w-full h-auto max-h-96 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => post.featured_images && post.featured_images[0] && window.open(post.featured_images[0], '_blank')}
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {post.featured_images.map((imagePath, index) => (
                    <img
                      key={index}
                      src={imagePath}
                      alt={`${post.title} - Image ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => window.open(imagePath, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price Information & Add to Cart */}
          {(post.price_range || (post as any).price || post.product_type === 'Tải xuống') && (
            <div className="bg-grey-200 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Pricing</h3>
              <div className="space-y-2 mb-6">
                {post.price_range && (
                  <p className="text-lg text-green-800">
                    <span className="font-semibold">Price Range:</span> {post.price_range}
                  </p>
                )}
                {(post as any).price && (
                  <p className="text-lg text-green-800">
                    <span className="font-semibold">Price:</span> ${parseFloat((post as any).price).toFixed(2)}
                  </p>
                )}
                {(post as any).sale_price && (
                  <p className="text-lg text-green-800">
                    <span className="font-semibold">Sale Price:</span> ${parseFloat((post as any).sale_price).toFixed(2)}
                    {(post as any).price && (
                      <span className="text-sm text-green-600 ml-2">
                        ({(((Number((post as any).price) - Number((post as any).sale_price)) / Number((post as any).price)) * 100).toFixed(1)}% off)
                      </span>
                    )}
                  </p>
                )}
                {post.product_type === 'Tải xuống' && !(post as any).price && (
                  <p className="text-lg text-green-800">
                    <span className="font-semibold">Price:</span> Free
                  </p>
                )}
              </div>

              {/* Add to Cart Section */}
              <div className="space-y-3 border-t border-green-200 pt-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-green-900">Quantity:</label>
                  <div className="flex items-center border border-green-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1 text-green-600 hover:bg-blue-500 transition-colors"
                    >
                      −
                    </button>
                    <span className="px-4 py-1 border-l border-r border-green-300 min-w-[40px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1 text-green-600 hover:bg-blue-500 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </button>

                {/* Notification */}
                {showAddedNotification && (
                  <div className="px-4 py-2 bg-blue-500 text-gray-900 rounded-lg text-sm font-medium animate-pulse">
                    ✓ Added {quantity} item(s) to cart!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Short Description */}
          {post.short_description && (
            <div className="bg-grey-200 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Summary</h3>
              <p className="text-gray-700 text-lg leading-relaxed">{post.short_description}</p>
            </div>
          )}

          {/* Detail Description */}
          {(post as any).detail_description && (
            <div className="bg-grey-200 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Details</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{(post as any).detail_description}</p>
            </div>
          )}

          {/* Main Content */}
          {post.content && (
            <div className="prose prose-lg max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Description</h3>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>
            </div>
          )}

          {/* Categories */}
          {(post as any).categories && (post as any).categories.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {((post as any).categories as string[]).map((category, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-blue-500 text-gray-800 rounded-full text-sm font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attributes (for variant products) */}
          {(post as any).attributes && (post as any).attributes.length > 0 && (
            <div className="bg-grey-200 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">Attributes</h3>
              <div className="space-y-4">
                {((post as any).attributes as any[]).map((attribute, attrIndex) => (
                  <div key={attrIndex} className="bg-grey-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{attribute.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {attribute.options && attribute.options.map((option: any, optIndex: number) => (
                        <span
                          key={optIndex}
                          className="px-3 py-1 bg-blue-500 text-purple-800 rounded-full text-sm"
                        >
                          {option.value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Files (for download products) */}
          {(post as any).download_files && (
            <div className="bg-grey-200 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Available for Download</h3>
              <div className="space-y-3">
                <div className="bg-grey-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900">{(post as any).download_files.name}</p>
                      <p className="text-sm text-gray-600">{(post as any).download_files.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // In a real app, this would trigger download
                      alert('Download functionality would be implemented here');
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* External Links (for download products) */}
          {(post as any).link_files && (post as any).link_files.length > 0 && (
            <div className="bg-grey-200 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">External Links</h3>
              <div className="space-y-3">
                {((post as any).link_files as any[]).map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-grey-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{link.title}</p>
                        <p className="text-sm text-gray-600 truncate">{link.url}</p>
                      </div>
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
