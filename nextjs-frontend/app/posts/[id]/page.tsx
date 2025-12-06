import { Metadata } from 'next';
import PostDetailClient from './PostDetailClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com';
const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || 'https://centimet2.com:8000';

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
      ? `${API_BASE_URL}/posts/${id}`
      : `${API_BASE_URL}/posts/slug/${id}`;

    const response = await fetch(endpoint, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error fetching post for metadata:', error);
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
    return {
      title: 'Bài viết không tìm thấy | Centimet2',
      description: 'Bài viết này không tồn tại hoặc đã bị xóa.',
    };
  }

  // Get the first image for OG
  const getImageUrl = (): string => {
    // Use dynamic share image from Laravel
    return `${LARAVEL_URL}/share-image/${post.id}`;
  };

  // Get featured image as fallback
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
  const ogImage = getImageUrl();
  const featuredImage = getFeaturedImage();
  const postUrl = `${SITE_URL}/posts/${post.slug || post.id}`;

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
          width: 1200,
          height: 630,
          alt: title,
        },
        // Include featured image as fallback
        ...(featuredImage ? [{
          url: featuredImage,
          width: 800,
          height: 600,
          alt: title,
        }] : []),
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
      canonical: postUrl,
    },
    other: {
      'article:author': authorName,
      'article:published_time': post.created_at || '',
      'article:modified_time': post.updated_at || '',
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
