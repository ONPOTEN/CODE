import { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

// Force dynamic rendering to prevent build-time API calls
export const dynamic = 'force-dynamic';

// Để tìm nạp metadata phía máy chủ, sử dụng trực tiếp LARAVEL_API_URL (không phải proxy)
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://centimet2.com:8000/api/v1';
// Đối với URL hình ảnh OG sẽ được truy cập bởi trình thu thập thông tin bên ngoài, sử dụng URL proxy công khai
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8088/api/proxy';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com';

interface ShopPostData {
  id: number;
  title: string;
  content?: string;
  short_description?: string;
  price?: string;
  price_range?: string;
  product_type?: string;
  main_image?: string;
  featured_images?: string[];
  created_at?: string;
  updated_at?: string;
  view_count?: number;
  shop?: {
    id: number;
    name: string;
    logo?: string;
  };
}

// Hàm tìm nạp phía máy chủ cho metadata
async function getShopPost(shopId: string, postId: string): Promise<ShopPostData | null> {
  try {
    const endpoint = `${LARAVEL_API_URL}/shops/${shopId}/posts/${postId}`;
    console.log('[Metadata] Đang lấy bài viết cửa hàng từ:', endpoint);

    const response = await fetch(endpoint, {
      next: { revalidate: 60 }, // Lưu trong 60 giây
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NextJS-Server/1.0',
      },
    });

    console.log('[Metadata] Trạng thái phản hồi:', response.status);

    if (!response.ok) {
      console.error('[Metadata] API trả về lỗi:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('[Metadata] Đã nhận dữ liệu bài viết cửa hàng:', { id: data.data?.id || data?.id });
    return data.data || data;
  } catch (error) {
    console.error('[Metadata] Lỗi khi lấy bài viết cửa hàng:', error);
    return null;
  }
}

// Tạo metadata cho trang
export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string; postId: string }>
}): Promise<Metadata> {
  const { id: shopId, postId } = await params;
  const post = await getShopPost(shopId, postId);

  if (!post) {
    // Sử dụng hình ảnh giữ chỗ (post ID 0 trả về hình ảnh giữ chỗ)
    return {
      title: 'Sản phẩm không tìm thấy | Centimet2',
      description: 'Sản phẩm này không tồn tại hoặc đã bị xóa.',
      openGraph: {
        type: 'article',
        title: 'Sản phẩm không tìm thấy',
        description: 'Sản phẩm này không tồn tại hoặc đã bị xóa.',
        url: `${SITE_URL}/shops/${shopId}/posts/${postId}`,
        siteName: 'Centimet2',
        images: [
          {
            url: `${SITE_URL}/api/og-image/0`,
            width: 1200,
            height: 630,
            alt: 'Centimet2',
          },
        ],
      },
    };
  }

  // Always use local API route for OG image (avoids S3 validation issues)
  const ogImage = `${SITE_URL}/api/og-image/shop/${shopId}/posts/${postId}`;

  const title = post.title || 'Sản phẩm';
  const description = post.short_description || post.content?.substring(0, 160).replace(/<[^>]*>/g, '') || 'Xem sản phẩm trên Centimet2';
  const shopName = post.shop?.name || 'Cửa hàng';
  // og:url phải khớp với URL đang được truy cập
  const postUrl = `${SITE_URL}/shops/${shopId}/posts/${postId}`;

  // Định dạng giá cho mô tả
  let priceText = '';
  if (post.price) {
    priceText = ` - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(parseFloat(post.price))}`;
  } else if (post.price_range) {
    priceText = ` - ${post.price_range}`;
  }

  return {
    title: `${title} - ${shopName} | Centimet2`,
    description: `${description}${priceText}`,
    openGraph: {
      type: 'website',
      title: `${title}${priceText}`,
      description,
      url: postUrl,
      siteName: 'Centimet2',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title}${priceText}`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: postUrl,
    },
    other: {
      'product:price:amount': post.price || '',
      'product:price:currency': 'VND',
      'og:price:amount': post.price || '',
      'og:price:currency': 'VND',
    },
  };
}

// Thành phần Trang
export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ id: string; postId: string }>
}) {
  const { id: shopId, postId } = await params;

  return <ProductDetailClient shopId={shopId} postId={postId} />;
}
