'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { shopPosts, type ShopPost, orders } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ShopPostEngagementButtons } from '@/components/ShopPostEngagementButtons';
import { ShopPostComments } from '@/components/ShopPostComments';
import { VideoEmbedList } from '@/components/VideoEmbed';

interface ProductDetailClientProps {
  shopId: string;
  postId: string;
}

export default function ProductDetailClient({ shopId, postId }: ProductDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const shopIdNum = Number(shopId);
  const postIdNum = Number(postId);

  const [post, setPost] = useState<ShopPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showAddedNotification, setShowAddedNotification] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>({});
  const [selectedOptionData, setSelectedOptionData] = useState<{ [key: string]: any }>({});
  const [attributeError, setAttributeError] = useState<string | null>(null);
  const [hasCompletedOrder, setHasCompletedOrder] = useState(false);

  useEffect(() => {
    fetchPost();
    if (user) {
      checkUserOrderStatus();
    }
  }, [postIdNum, shopIdNum, user]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await shopPosts.getById(shopIdNum, postIdNum);
      let postData = response && typeof response === 'object' && 'id' in response ? response : (response as any)?.data;

      if (!postData) {
        throw new Error('Post not found');
      }

      console.log('[ProductDetail] Post loaded:', postData);
      console.log('[ProductDetail] Product type:', postData.product_type);
      console.log('[ProductDetail] Attributes:', JSON.stringify(postData.attributes));
      setPost(postData);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const checkUserOrderStatus = async () => {
    if (!user) return;

    try {
      const ordersResponse = await orders.myOrders({ shop_id: shopIdNum, per_page: 100 });
      const allOrders = ordersResponse.data || ordersResponse;

      console.log('[ProductDetail] Checking order status for postId:', postIdNum, 'shopId:', shopIdNum);
      console.log('[ProductDetail] All orders:', allOrders);

      if (Array.isArray(allOrders)) {
        const completedOrder = allOrders.find((order: any) => {
          // Only include completed orders - strict check
          const isCompleted = order.status === 'completed';
          console.log('[ProductDetail] Order', order.id, 'status:', order.status, 'isCompleted:', isCompleted);

          if (!isCompleted) return false;

          const items = order.items || [];
          console.log('[ProductDetail] Checking order', order.id, 'with', items.length, 'items');

          const hasProduct = items.some((item: any) => {
            // Try multiple possible field names for product ID
            const possibleIds = [
              item.id,
              item.postId,
              item.post_id,
              item.product_id,
            ];

            const matches = possibleIds.some(id => {
              const isMatch = parseInt(String(id)) === postIdNum;
              if (isMatch) {
                console.log('[ProductDetail] MATCH FOUND! Item field value:', id, 'Post ID:', postIdNum);
              }
              return isMatch;
            });

            console.log('[ProductDetail] Item with possible IDs:', possibleIds, 'Post ID:', postIdNum, 'Matches:', matches);
            return matches;
          });

          console.log('[ProductDetail] Order', order.id, 'has product:', hasProduct);
          return hasProduct;
        });

        const hasCompleted = !!completedOrder;
        console.log('[ProductDetail] Final result - Has completed order:', hasCompleted);
        console.log('[ProductDetail] Completed order details:', completedOrder);
        setHasCompletedOrder(hasCompleted);
      } else {
        console.warn('[ProductDetail] Orders response is not an array:', allOrders);
      }
    } catch (err) {
      console.error('[ProductDetail] Error checking order status:', err);
    }
  };

  const handleAddToCart = () => {
    if (!post) return;

    // Validate attributes for variant products
    if (post.product_type === 'Biến thể') {
      const attributes = (post as any).attributes || [];
      const missingAttributes = attributes.filter(
        (attr: any) => !selectedAttributes[attr.name]
      );

      if (missingAttributes.length > 0) {
        setAttributeError(
          `Please select all attributes: ${missingAttributes.map((a: any) => a.name).join(', ')}`
        );
        return;
      }
    }

    setAttributeError(null);

    // Get price - check for selected option price first (for variant products)
    let price = parseFloat((post as any).price) || 0;
    let image = (post as any).main_image || post.featured_images?.[0] || '/placeholder.png';

    // For variant products, use selected option's price and image if available
    if (post.product_type === 'Biến thể' && Object.keys(selectedOptionData).length > 0) {
      const optionWithPrice = Object.values(selectedOptionData).find((opt: any) => opt?.price);
      if (optionWithPrice) {
        price = parseFloat((optionWithPrice as any).price) || price;
      }
      // Use option image if available
      const optionWithImage = Object.values(selectedOptionData).find((opt: any) => opt?.image);
      if (optionWithImage && (optionWithImage as any).image) {
        image = (optionWithImage as any).image;
      }
    }

    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: Math.random(),
        postId: post.id,
        shopId: shopIdNum,
        title: post.title,
        price: price > 0 ? price : 0,
        image,
        product_type: post.product_type || 'unknown',
        type: post.type,
        attributes: post.product_type === 'Biến thể' ? selectedAttributes : undefined,
      });
    }

    setShowAddedNotification(true);
    setTimeout(() => setShowAddedNotification(false), 3000);
    setQuantity(1);
    setSelectedAttributes({});
    setSelectedOptionData({});
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
          <p className="text-gray-500 mb-6">{error || 'Sản phẩm bạn đang tìm kiếm không tồn tại.'}</p>
          <Link
            href={`/shops/${shopIdNum}`}
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại cửa hàng
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
              href={`/shops/${shopIdNum}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại
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
              Đi tới giỏ hàng
            </Link>
            {isOwner && (
              <Link
                href={`/shops/${shopIdNum}/posts/${postIdNum}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Sửa
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        <article className="bg-grey-200 rounded-lg shadow-md space-y-8 p-6">
          {/* Title and Badges */}
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h1 className="text-4xl font-bold text-gray-900">{post.title}</h1>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-6 text-sm text-gray-600 py-4 border-t border-b border-gray-300">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {post.view_count} lượt xem
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(post.created_at).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              {post.shop && (
                <Link
                  href={`/shops/${post.shop.id}`}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  {post.shop.logo ? (
                    <img
                      src={post.shop.logo}
                      alt={post.shop.name}
                      className="w-6 h-6 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {post.shop.name?.charAt(0) || 'S'}
                      </span>
                    </div>
                  )}
                  <span className="font-medium">{post.shop.name}</span>
                </Link>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Hình ảnh bổ sung</h3>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Hình ảnh nổi bật</h3>
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

          {/* Attribute Selection for Variant Products */}
          {(post.product_type === 'Biến thể' || post.product_type?.includes('Bi')) && (post as any).attributes && Array.isArray((post as any).attributes) && (post as any).attributes.length > 0 && (
            <div className="bg-grey-200 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">Chọn thuộc tính</h3>
              <div className="space-y-4">
                {((post as any).attributes as any[]).map((attribute, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-purple-300">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      {attribute.name} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {attribute.options && attribute.options.map((option: any, optIndex: number) => (
                        <button
                          key={optIndex}
                          onClick={() => {
                            setSelectedAttributes({
                              ...selectedAttributes,
                              [attribute.name]: option.value
                            });
                            setSelectedOptionData({
                              ...selectedOptionData,
                              [attribute.name]: option
                            });
                          }}
                          className={`flex flex-col items-center p-2 rounded-lg border-2 font-medium transition-all min-w-[80px] ${
                            selectedAttributes[attribute.name] === option.value
                              ? 'bg-purple-500 border-purple-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900 hover:border-purple-400'
                          }`}
                        >
                          {/* Option Image */}
                          {option.image && (
                            <img
                              src={option.image}
                              alt={option.value}
                              className="w-16 h-16 object-cover rounded-lg mb-2 border border-gray-200"
                            />
                          )}
                          {/* Option Value */}
                          <span className="text-sm">{option.value}</span>
                          {/* Option Price */}
                          {option.price && (
                            <span className={`text-xs mt-1 ${
                              selectedAttributes[attribute.name] === option.value
                                ? 'text-purple-100'
                                : 'text-green-600'
                            }`}>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(parseFloat(option.price))}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {attributeError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {attributeError}
                </div>
              )}
            </div>
          )}

          {/* Price Information & Add to Cart */}
          {(post.price_range || (post as any).price || post.product_type === 'Tải xuống') && (
            <div className="bg-grey-200 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Giá cả</h3>
              <div className="space-y-2 mb-6">
                {/* Show selected option price for variant products */}
                {post.product_type === 'Biến thể' && Object.keys(selectedOptionData).length > 0 && (() => {
                  // Find the first selected option with a price
                  const optionWithPrice = Object.values(selectedOptionData).find((opt: any) => opt?.price);
                  if (optionWithPrice) {
                    const optionPrice = parseFloat((optionWithPrice as any).price);
                    const basePrice = parseFloat((post as any).price) || 0;

                    return (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-purple-600 mb-2">Giá biến thể đã chọn:</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(optionPrice)}
                        </p>
                        {basePrice > 0 && optionPrice !== basePrice && (
                          <p className="text-sm text-gray-500 line-through mt-1">
                            Giá gốc: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(basePrice)}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {post.price_range && (
                  <p className="text-lg text-green-800">
                    <span className="font-semibold">Khoảng giá:</span> {post.price_range}
                  </p>
                )}
                {(post as any).price && (
                  <p className="text-lg text-green-800">
                    <span className="font-semibold">Giá gốc:</span> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(parseFloat((post as any).price))}
                  </p>
                )}
                {(post as any).sale_price && (
                  <p className="text-lg text-green-800">
                    <span className="font-semibold">Giá khuyến mãi:</span> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(parseFloat((post as any).sale_price))}
                    {(post as any).price && (
                      <span className="text-sm text-green-600 ml-2">
                        ({(((Number((post as any).price) - Number((post as any).sale_price)) / Number((post as any).price)) * 100).toFixed(1)}% off)
                      </span>
                    )}
                  </p>
                )}
                {post.product_type === 'Tải xuống' && !(post as any).price && (
                  <p className="text-lg text-green-800">
                    <span className="font-semibold">Giá:</span> Miễn phí
                  </p>
                )}
              </div>

              {/* Add to Cart Section */}
              <div className="space-y-3 border-t border-green-200 pt-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-green-900">Số lượng:</label>
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
                  Thêm vào giỏ hàng
                </button>

                {/* Notification */}
                {showAddedNotification && (
                  <div className="px-4 py-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-sm font-medium animate-pulse">
                    <div>✓ Đã thêm {quantity} sản phẩm vào giỏ hàng!</div>
                    {Object.keys(selectedAttributes).length > 0 && (
                      <div className="mt-1 text-xs text-green-700">
                        {Object.entries(selectedAttributes).map(([key, value]) => (
                          <div key={key}>{key}: {value}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Engagement Buttons - Inside Price Section */}
                <div className="border-t border-green-200 pt-4 mt-4">
                  <ShopPostEngagementButtons
                    postId={postIdNum}
                    shopId={shopIdNum}
                    postTitle={post.title}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Short Description */}
          {post.short_description && (
            <div className="bg-grey-200 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Tóm tắt</h3>
              <p className="text-gray-700 text-lg leading-relaxed">{post.short_description}</p>
            </div>
          )}

          {/* Detail Description */}
          {(post as any).detail_description && (
            <div className="bg-grey-200 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Chi tiết</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{(post as any).detail_description}</p>
            </div>
          )}

          {/* Main Content */}
          {post.content && (
            <div className="prose prose-lg max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Mô tả</h3>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>
              {/* Video Embeds from content */}
              <VideoEmbedList content={post.content} className="mt-4" />
            </div>
          )}

          {/* Categories */}
          {(post as any).categories && (post as any).categories.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Danh mục</h3>
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

          {/* Download Products - Only Show if User Has Completed Order */}
          {post?.product_type === 'Tải xuống' && hasCompletedOrder && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Tải xuống có sẵn sau khi mua</h3>
              <div className="space-y-3">
                {(post as any).download_files && (Array.isArray((post as any).download_files) ? ((post as any).download_files as any[]) : [(post as any).download_files]).map((file: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-lg p-4 flex items-center justify-between border border-gray-200">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-gray-900">{typeof file === 'string' ? file.split('/').pop() : file.name || `File ${idx + 1}`}</p>
                        <p className="text-sm text-gray-600">{typeof file === 'string' ? 'Tệp tải xuống' : file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Tệp'}</p>
                      </div>
                    </div>
                    <a href={typeof file === 'string' ? file : file.url || file} download className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Tải xuống
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Links (for download products) - Only Show if User Has Completed Order */}
          {post?.product_type === 'Tải xuống' && hasCompletedOrder && (post as any).link_files && (post as any).link_files.length > 0 && (
            <div className="bg-grey-200 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Liên kết ngoài</h3>
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

          {/* Comments Section */}
          <div className="border-t border-gray-200 pt-6">
            <ShopPostComments postId={postIdNum} />
          </div>
        </article>
      </div>
    </div>
  );
}
