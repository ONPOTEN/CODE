'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { shopPosts, ShopPost, ApiException } from '@/lib/api';
import Menu from '@/components/Menu';

// Skeleton Component for Loading State
const ProductSkeleton = () => (
  <div className="bg-white/50 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden animate-pulse">
    <div className="aspect-square bg-slate-200" />
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-slate-200" />
        <div className="h-3 w-20 bg-slate-200 rounded" />
      </div>
      <div className="h-4 w-full bg-slate-200 rounded" />
      <div className="h-4 w-2/3 bg-slate-200 rounded" />
      <div className="h-5 w-24 bg-slate-200 rounded mt-4" />
    </div>
  </div>
);

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
    if (product.main_image) {
      if (product.main_image.startsWith('http')) return product.main_image;
      return `${process.env.NEXT_PUBLIC_S3_URL || 'https://s3.amazonaws.com'}/shop_posts/${product.main_image}`;
    }
    if (product.featured_images && product.featured_images.length > 0) {
      const img = product.featured_images[0];
      if (img.startsWith('http')) return img;
      return `${process.env.NEXT_PUBLIC_S3_URL || 'https://s3.amazonaws.com'}/shop_posts/${img}`;
    }
    return null;
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const [latestResponse, trendingResponse] = await Promise.all([
          shopPosts.getFeed({ per_page: 12 }),
          shopPosts.getTrending({ per_page: 12 })
        ]);
        setLatestProducts(latestResponse.data || []);
        setTrendingProducts(trendingResponse.data || []);
      } catch (err) {
        setError(err instanceof ApiException ? err.message : 'Không thể tải sản phẩm');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const ProductCard = ({ product }: { product: ShopPost }) => {
    const imageUrl = getProductImage(product);
    const hasDiscount = product.sale_price && product.price && product.sale_price < product.price;

    return (
      <Link
        href={`/shops/${product.shop_id}/posts/${product.id}`}
        className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
      >
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {hasDiscount && (
              <div className="bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md">
                -{Math.round((1 - (product.sale_price as number) / (product.price as number)) * 100)}%
              </div>
            )}
            {product.product_type === 'Tải xuống' && (
              <div className="bg-indigo-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md">
                Digital
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-100 shadow-sm relative shrink-0">
              {product.shop?.logo ? (
                <img src={product.shop.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">{product.shop?.name?.charAt(0) || 'S'}</span>
                </div>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500 truncate">{product.shop?.name || 'Cửa hàng'}</span>
          </div>

          <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-3 leading-snug group-hover:text-indigo-600 transition-colors">
            {product.title}
          </h3>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              {hasDiscount ? (
                <>
                  <span className="text-indigo-600 font-extrabold text-base">
                    {formatPrice(product.sale_price)}
                  </span>
                  <span className="text-slate-400 text-[10px] line-through -mt-1">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-slate-900 font-extrabold text-base">
                  {formatPrice(product.price || product.price_range || 'Liên hệ')}
                </span>
              )}
            </div>
            <div className="flex items-center text-[10px] text-slate-400 font-medium">
              {product.created_at ? getRelativeTime(product.created_at) : ''}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="hidden lg:block relative z-50">
        <Menu />
      </div>

      {/* Hero Header Section */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-violet-600 to-fuchsia-500">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }} />
          </div>
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-xl">
              Thế Giới <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-orange-300">Sản Phẩm</span>
            </h1>
            <p className="text-white/80 text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
              Khám phá những sản phẩm độc đáo từ các cửa hàng uy tín trên toàn cộng đồng Centimet2.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/shops" className="px-8 py-3.5 bg-white text-indigo-700 rounded-2xl font-bold transition-all hover:scale-105 hover:shadow-2xl shadow-indigo-500/20">
                Tìm Cửa Hàng
              </Link>
              <Link href="/shops/create" className="px-8 py-3.5 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-2xl font-bold transition-all hover:bg-white/30 hover:scale-105">
                Mở Shop Ngay
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Wave */}
        <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden leading-[0]">
          <svg viewBox="0 0 1440 120" className="relative block w-full h-full fill-[#F8FAFC]">
            <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
          </svg>
        </div>
      </section>

      {/* Content Section */}
      <section className="-mt-12 relative z-10 px-4 pb-20">
        <div className="max-w-7xl mx-auto space-y-16">
          
          {/* Trending Section */}
          <div className="space-y-8">
            <div className="flex items-end justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-sm uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  Đang thịnh hành
                </div>
                <h2 className="text-3xl font-black text-slate-800">Sản phẩm hot nhất</h2>
              </div>
              <Link href="/shops" className="hidden sm:flex items-center gap-1 text-indigo-600 font-bold text-sm hover:gap-2 transition-all">
                Xem tất cả <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-center">
                <p className="text-rose-600 font-medium">{error}</p>
              </div>
            ) : trendingProducts.length === 0 ? (
              <div className="bg-slate-100 p-12 rounded-3xl text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-500 font-medium italic">Hiện chưa có sản phẩm thịnh hành</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
                {trendingProducts.map((product) => (
                  <ProductCard key={`trending-${product.id}`} product={product} />
                ))}
              </div>
            )}
          </div>

          {/* Latest Section */}
          <div className="space-y-8">
            <div className="flex items-end justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                  Mới cập nhật
                </div>
                <h2 className="text-3xl font-black text-slate-800">Sản phẩm mới nhất</h2>
              </div>
              <Link href="/shops" className="hidden sm:flex items-center gap-1 text-indigo-600 font-bold text-sm hover:gap-2 transition-all">
                Xem tất cả <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
                {[...Array(12)].map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
                {latestProducts.map((product) => (
                  <ProductCard key={`latest-${product.id}`} product={product} />
                ))}
              </div>
            )}
            
            {!loading && latestProducts.length >= 12 && (
              <div className="pt-8 flex justify-center">
                <Link href="/shops" className="group px-8 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2">
                  Xem thêm sản phẩm
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-[80px]" />
          
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-white">Bạn đang có sản phẩm tuyệt vời?</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Bắt đầu hành trình kinh doanh của bạn tại Centimet2 ngay hôm nay. Miễn phí khởi tạo và hỗ trợ tối đa.
            </p>
            <div className="pt-4">
              <Link href="/shops/create" className="inline-block px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)]">
                Bắt đầu ngay bây giờ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
