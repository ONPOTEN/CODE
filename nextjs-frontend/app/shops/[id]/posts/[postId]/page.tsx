import { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

// For server-side metadata fetch, use LARAVEL_API_URL directly (not the proxy)
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://centimet2.com:8000/api/v1';
// For OG image URLs that will be accessed by external crawlers, use the public proxy URL
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8088/api/proxy';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com';
const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID || '';

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

// Server-side fetch function for metadata
async function getShopPost(shopId: string, postId: string): Promise<ShopPostData | null> {
  try {
    const endpoint = `${LARAVEL_API_URL}/shops/${shopId}/posts/${postId}`;
    console.log('[Metadata] Fetching shop post from:', endpoint);

    const response = await fetch(endpoint, {
      next: { revalidate: 60 }, // Cache for 60 seconds
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NextJS-Server/1.0',
      },
    });

    console.log('[Metadata] Response status:', response.status);

    if (!response.ok) {
      console.error('[Metadata] API returned error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('[Metadata] Shop post data received:', { id: data.data?.id || data?.id });
    return data.data || data;
  } catch (error) {
    console.error('[Metadata] Error fetching shop post:', error);
    return null;
  }
}

// Generate metadata for the page
export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string; postId: string }>
}): Promise<Metadata> {
  const { id: shopId, postId } = await params;
  const post = await getShopPost(shopId, postId);

  if (!post) {
    // Use placeholder image (post ID 0 returns placeholder)
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
            url: `${PUBLIC_API_URL}/share-image/0/image`,
            width: 1200,
            height: 630,
            alt: 'Centimet2',
          },
        ],
      },
      other: {
        ...(FB_APP_ID && { 'fb:app_id': FB_APP_ID }),
      },
    };
  }

  // Get product image as primary OG image (more reliable than generated images)
  const productImage = post.main_image || (post.featured_images && post.featured_images.length > 0 ? post.featured_images[0] : undefined);

  // Use product image directly, or fallback to share-image endpoint (returns actual image)
  const ogImage = productImage || `${PUBLIC_API_URL}/share-image/shop-post/${post.id}/image`;

  const title = post.title || 'Sản phẩm';
  const description = post.short_description || post.content?.substring(0, 160).replace(/<[^>]*>/g, '') || 'Xem sản phẩm trên Centimet2';
  const shopName = post.shop?.name || 'Cửa hàng';
  // og:url must match the URL being accessed
  const postUrl = `${SITE_URL}/shops/${shopId}/posts/${postId}`;

  // Format price for description
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
          width: productImage ? 800 : 1200,
          height: productImage ? 800 : 630,
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
      ...(FB_APP_ID && { 'fb:app_id': FB_APP_ID }),
    },
  };
}

// Page component
export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ id: string; postId: string }>
}) {
  const { id: shopId, postId } = await params;

  return <ProductDetailClient shopId={shopId} postId={postId} />;
}
