import { Metadata } from 'next';
import PostDetailClient from './PostDetailClient';

// For server-side metadata fetch, use LARAVEL_API_URL directly (not the proxy)
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://centimet2.com:8000/api/v1';
// For OG image URLs that will be accessed by external crawlers, use the public proxy URL
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8088/api/proxy';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com';
const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID || '';

interface PostData {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  featured_image?: string;
  images?: Array<{ id?: number; url: string } | string>;
  author?: {
    id: number;
    name?: string;
    display_name?: string;
    username?: string;
    avatar?: string;
  };
  created_at?: string;
  updated_at?: string;
}

// Server-side fetch function for metadata
async function getPost(id: string): Promise<PostData | null> {
  try {
    const numericId = parseInt(id);
    const isNumeric = !isNaN(numericId) && numericId.toString() === id;

    const endpoint = isNumeric
      ? `${LARAVEL_API_URL}/posts/${id}`
      : `${LARAVEL_API_URL}/posts/slug/${id}`;

    console.log('[Metadata] Fetching post from:', endpoint);

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
    console.log('[Metadata] Post data received:', { id: data.data?.id || data?.id, title: data.data?.title || data?.title });
    return data.data || data;
  } catch (error) {
    console.error('[Metadata] Error fetching post:', error);
    return null;
  }
}

// Generate metadata for the page
export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    // Still provide og:image for fallback case so Facebook doesn't complain
    // Use placeholder image (post ID 0 returns placeholder)
    // IMPORTANT: og:url must match the actual URL being accessed
    return {
      title: 'Bài viết không tìm thấy | Centimet2',
      description: 'Bài viết này không tồn tại hoặc đã bị xóa.',
      openGraph: {
        type: 'article',
        title: 'Bài viết không tìm thấy',
        description: 'Bài viết này không tồn tại hoặc đã bị xóa.',
        url: `${SITE_URL}/posts/${id}`,
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

  // Get featured image as primary OG image (more reliable than generated images)
  const getFeaturedImage = (): string | undefined => {
    if (post.featured_image) {
      return post.featured_image;
    }
    if (post.images && post.images.length > 0) {
      const firstImage = post.images[0];
      return typeof firstImage === 'string' ? firstImage : firstImage.url;
    }
    return undefined;
  };

  const title = post.title || 'Bài viết';
  const description = post.excerpt || post.content?.substring(0, 160).replace(/<[^>]*>/g, '') || 'Xem bài viết trên Centimet2';
  const authorName = post.author?.display_name || post.author?.name || post.author?.username || 'Centimet2 User';
  const featuredImage = getFeaturedImage();
  // Use featured image directly, or fallback to share-image endpoint (returns actual image)
  const ogImage = featuredImage || `${PUBLIC_API_URL}/share-image/${post.id}/image`;
  // IMPORTANT: og:url must match the URL being accessed - use numeric ID from the request, not slug
  const postUrl = `${SITE_URL}/posts/${id}`;
  const canonicalUrl = `${SITE_URL}/posts/${post.id}`;

  return {
    title: `${title} | Centimet2`,
    description,
    authors: [{ name: authorName }],
    openGraph: {
      type: 'article',
      title,
      description,
      url: postUrl,
      siteName: 'Centimet2',
      images: [
        {
          url: ogImage,
          width: featuredImage ? 800 : 1200,
          height: featuredImage ? 600 : 630,
          alt: title,
        },
      ],
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      authors: [authorName],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      creator: `@${post.author?.username || 'centimet2'}`,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    other: {
      'article:author': authorName,
      'article:published_time': post.created_at || '',
      'article:modified_time': post.updated_at || '',
      ...(FB_APP_ID && { 'fb:app_id': FB_APP_ID }),
    },
  };
}

// Page component
export default async function ViewPostPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  return <PostDetailClient postId={id} />;
}
