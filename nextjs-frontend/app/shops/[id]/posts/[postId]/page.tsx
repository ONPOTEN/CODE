import { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com';
const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || 'https://centimet2.com:8000';

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
    const response = await fetch(`${API_BASE_URL}/shops/${shopId}/posts/${postId}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error fetching shop post for metadata:', error);
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
    return {
      title: 'Sản phẩm không tìm thấy | Centimet2',
      description: 'Sản phẩm này không tồn tại hoặc đã bị xóa.',
    };
  }

  // Get the image for OG - use Laravel endpoint that redirects to actual product image
  const ogImage = `${LARAVEL_URL}/og-image/shop-post/${post.id}`;

  // Get product image as fallback
  const productImage = post.main_image || (post.featured_images && post.featured_images.length > 0 ? post.featured_images[0] : undefined);

  const title = post.title || 'Sản phẩm';
  const description = post.short_description || post.content?.substring(0, 160).replace(/<[^>]*>/g, '') || 'Xem sản phẩm trên Centimet2';
  const shopName = post.shop?.name || 'Cửa hàng';
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
          width: 1200,
          height: 630,
          alt: title,
        },
        // Include product image as fallback
        ...(productImage ? [{
          url: productImage,
          width: 800,
          height: 800,
          alt: title,
        }] : []),
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

// Page component
export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ id: string; postId: string }>
}) {
  const { id: shopId, postId } = await params;

  return <ProductDetailClient shopId={shopId} postId={postId} />;
}
