import { Metadata } from 'next';
import PostDetailClient from './PostDetailClient';

// Force dynamic rendering to prevent build-time API calls
export const dynamic = 'force-dynamic';

// For server-side metadata fetch, use LARAVEL_API_URL directly (not the proxy)
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://centimet2.com:8000/api/v1';
// For OG image URLs that will be accessed by external crawlers, use the public proxy URL
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8088/api/proxy';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com';

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
      next: { revalidate: 10 }, // Cache for 10 seconds for fresher metadata
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
    const post = data.data || data;
    console.log('[Metadata] Post data received:', {
      id: post?.id,
      title: post?.title,
      hasContent: !!post?.content,
      contentLength: post?.content?.length,
      contentPreview: post?.content?.substring(0, 100)
    });
    return post;
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
            url: `${SITE_URL}/api/og-image/0`,
            width: 1200,
            height: 630,
            alt: 'Centimet2',
          },
        ],
      },
    };
  }

  // Extract first N words from content (strip HTML tags)
  const getFirstWords = (content: string | undefined, wordCount: number): string => {
    if (!content) return '';
    // Remove HTML tags and decode entities
    const plainText = content
      .replace(/<[^>]*>/g, ' ')  // Replace HTML tags with space
      .replace(/&nbsp;/g, ' ')   // Replace &nbsp;
      .replace(/&amp;/g, '&')    // Replace &amp;
      .replace(/&lt;/g, '<')     // Replace &lt;
      .replace(/&gt;/g, '>')     // Replace &gt;
      .replace(/&quot;/g, '"')   // Replace &quot;
      .replace(/&#39;/g, "'")    // Replace &#39;
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();

    const words = plainText.split(' ').filter(word => word.length > 0);
    const firstWords = words.slice(0, wordCount).join(' ');

    // Add ellipsis if content was truncated
    if (words.length > wordCount) {
      return firstWords + '...';
    }
    return firstWords;
  };

  // Use title if available, otherwise get first 36 words from content
  const contentText = getFirstWords(post.content, 36);
  const postTitle = post.title?.trim();
  // Use title if it exists and is not empty, otherwise use content preview (36 words)
  const title = contentText;
  const description = post.excerpt?.trim() || getFirstWords(post.content, 50) || 'Xem bài viết trên Centimet2';

  console.log('[Metadata] Generated OG metadata:', {
    postTitle: post.title,
    contentPreview: contentText?.substring(0, 100),
    finalTitle: title?.substring(0, 100),
    finalDescription: description?.substring(0, 100)
  });
  const authorName = post.author?.display_name || post.author?.name || post.author?.username || 'Centimet2 User';
  
  // Always use local API route for OG image (avoids S3 validation issues)
  const ogImage = `${SITE_URL}/api/og-image/${id}`;
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
          width: 1200,
          height: 630,
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
