'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { shopPosts, ShopPost, ApiException } from '@/lib/api';
import Menu from '@/components/Menu';

export default function ShopsFeedPage() {
  const [latestProducts, setLatestProducts] = useState<ShopPost[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<ShopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (secondsAgo < 60) return 'vừa xong';
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} phút trước`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} giờ trước`;
    if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)} ngày trước`;
    if (secondsAgo < 2592000) return `${Math.floor(secondsAgo / 604800)} tuần trước`;
    return `${Math.floor(secondsAgo / 2592000)} tháng trước`;
  };

  const formatPrice = (price: number | string | undefined): string => {
    if (!price) return '';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const getProductImage = (product: ShopPost): string | null => {
    // Try main_image first
    if (product.main_image) {
      if (product.main_image.startsWith('http')) {
        return product.main_image;
      }
      return `${process.env.NEXT_PUBLIC_S3_URL || 'https://s3.amazonaws.com'}/shop_posts/${product.main_image}`;
    }
    // Then try featured_images
    if (product.featured_images && product.featured_images.length > 0) {
      const img = product.featured_images[0];
      if (img.startsWith('http')) {
        return img;
      }
      return `${process.env.NEXT_PUBLIC_S3_URL || 'https://s3.amazonaws.com'}/shop_posts/${img}`;
    }
    return null;
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        // Fetch both latest and trending products in parallel
        const [latestResponse, trendingResponse] = await Promise.all([
          shopPosts.getFeed({ per_page: 10 }),
          shopPosts.getTrending({ per_page: 10 })
        ]);

        setLatestProducts(latestResponse.data || []);
        setTrendingProducts(trendingResponse.data || []);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError('Không thể tải sản phẩm');
        }
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Product Card Component
  const ProductCard = ({ product }: { product: ShopPost }) => {
    const imageUrl = getProductImage(product);
    const hasDiscount = product.sale_price && product.price && product.sale_price < product.price;

    return (
      <Link
        href={`/shops/${product.shop_id}/posts/${product.id}`}
        className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
      >
        {/* Product Image */}
        <div className="relative aspect-square bg-gray-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{Math.round((1 - (product.sale_price as number) / (product.price as number)) * 100)}%
            </div>
          )}
          {/* Product Type Badge */}
          {product.product_type === 'Tải xuống' && (
            <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">
              Digital
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3">
          {/* Shop Info */}
          <div className="flex items-center gap-2 mb-2">
            {product.shop?.logo ? (
              <img
                src={product.shop.logo}
                alt={product.shop.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {product.shop?.name?.charAt(0) || 'S'}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-500 truncate flex-1">
              {product.shop?.name || 'Shop'}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2">
            {hasDiscount ? (
              <>
                <span className="text-red-600 font-bold text-sm">
                  {formatPrice(product.sale_price)}
                </span>
                <span className="text-gray-400 text-xs line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : product.price ? (
              <span className="text-gray-900 font-bold text-sm">
                {formatPrice(product.price)}
              </span>
            ) : product.price_range ? (
              <span className="text-gray-900 font-bold text-sm">
                {product.price_range}
              </span>
            ) : (
              <span className="text-gray-500 text-sm">Liên hệ để biết giá</span>
            )}
          </div>

          {/* Time */}
          <div className="mt-2 text-xs text-gray-400">
            {product.created_at ? getRelativeTime(product.created_at) : ''}
          </div>
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="hidden lg:block">
          <Menu />
        </div>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="hidden lg:block">
          <Menu />
        </div>
        <section className="w-full px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Lỗi khi tải sản phẩm</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Menu - Desktop Only */}
      <div className="hidden lg:block">
        <Menu />
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm</h1>
          <Link
            href="/shops"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
          >
            Xem tất cả Shops
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Products Sections */}
      <section className="w-full px-4 pb-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Latest Products Section */}
          <div>
            {/* Latest Products Header */}
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-bold text-gray-900">Sản phẩm mới nhất</h2>
            </div>

            {latestProducts.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                <p className="text-sm">Chưa có sản phẩm mới.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {latestProducts.map((product) => (
                    <ProductCard key={`latest-${product.id}`} product={product} />
                  ))}
                </div>

                {/* View More Link */}
                {latestProducts.length >= 10 && (
                  <div className="mt-4 text-center">
                    <Link
                      href="/shops"
                      className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Xem thêm sản phẩm mới
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Trending Products Section */}
          <div>
            {/* Trending Products Header */}
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.551 1.735-4.672 3.668-6.32.771-.657 1.554-1.224 2.188-1.718.404-.315.752-.6 1.017-.849.129-.121.237-.228.32-.318.164-.179.307-.37.424-.583.117-.214.18-.406.195-.534.018-.15.188-.178.188-.178s.17.028.188.178c.015.128.078.32.195.534.117.213.26.404.424.583.083.09.191.197.32.318.265.249.613.534 1.017.849.634.494 1.417 1.061 2.188 1.718C18.265 11.328 20 13.449 20 16c0 3.866-3.134 7-7 7z"/>
              </svg>
              <h2 className="text-lg font-bold text-gray-900">Sản phẩm thịnh hành</h2>
            </div>

            {trendingProducts.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                <p className="text-sm">Chưa có sản phẩm thịnh hành.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {trendingProducts.map((product) => (
                    <ProductCard key={`trending-${product.id}`} product={product} />
                  ))}
                </div>

                {/* View More Link */}
                {trendingProducts.length >= 10 && (
                  <div className="mt-4 text-center">
                    <Link
                      href="/shops"
                      className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Xem thêm sản phẩm thịnh hành
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
