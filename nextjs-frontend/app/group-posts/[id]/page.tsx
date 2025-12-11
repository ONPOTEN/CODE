import { Metadata } from 'next';
import GroupPostDetailClient from './GroupPostDetailClient';

// For server-side metadata fetch, use LARAVEL_API_URL directly (not the proxy)
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://centimet2.com:8000/api/v1';
// For OG image URLs that will be accessed by external crawlers, use the public proxy URL
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8088/api/proxy';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com';
const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID || '';

interface GroupPostData {
  id: number;
  post_title: string;
  post_content: string;
  post_excerpt?: string;
  post_date?: string;
  post_modified?: string;
  images?: string[];
  group?: {
    group_id: number;
    group_name: string;
  };
  author?: {
    id: number;
    name?: string;
    display_name?: string;
    username?: string;
    avatar?: string;
  };
}

// Server-side fetch function for metadata
async function getGroupPost(id: string): Promise<GroupPostData | null> {
  try {
    console.log('[Metadata] Fetching group post from:', `${LARAVEL_API_URL}/group-posts/${id}`);

    const response = await fetch(`${LARAVEL_API_URL}/group-posts/${id}`, {
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
    console.log('[Metadata] Group post data received:', { id: data.data?.id || data?.id });
    return data.data || data;
  } catch (error) {
    console.error('[Metadata] Error fetching group post:', error);
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
  const post = await getGroupPost(id);

  if (!post) {
    // Use placeholder image (post ID 0 returns placeholder)
    return {
      title: 'Bài viết không tìm thấy | Centimet2',
      description: 'Bài viết này không tồn tại hoặc đã bị xóa.',
      openGraph: {
        type: 'article',
        title: 'Bài viết không tìm thấy',
        description: 'Bài viết này không tồn tại hoặc đã bị xóa.',
        url: `${SITE_URL}/group-posts/${id}`,
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

  // Get first post image as primary OG image (more reliable than generated images)
  const firstImage = post.images && post.images.length > 0 ? post.images[0] : undefined;

  // Use post image directly, or fallback to share-image endpoint (returns actual image)
  const ogImage = firstImage || `${PUBLIC_API_URL}/share-image/${post.id}/image`;

  const title = post.post_title || 'Bài viết nhóm';
  const description = post.post_excerpt || post.post_content?.substring(0, 160).replace(/<[^>]*>/g, '') || 'Xem bài viết nhóm trên Centimet2';
  const authorName = post.author?.display_name || post.author?.name || post.author?.username || 'Centimet2 User';
  const groupName = post.group?.group_name || 'Nhóm';
  // og:url must match the URL being accessed
  const postUrl = `${SITE_URL}/group-posts/${id}`;
  const canonicalUrl = `${SITE_URL}/group-posts/${post.id}`;

  return {
    title: `${title} - ${groupName} | Centimet2`,
    description,
    authors: [{ name: authorName }],
    openGraph: {
      type: 'article',
      title: `${title} - ${groupName}`,
      description,
      url: postUrl,
      siteName: 'Centimet2',
      images: [
        {
          url: ogImage,
          width: firstImage ? 800 : 1200,
          height: firstImage ? 600 : 630,
          alt: title,
        },
      ],
      publishedTime: post.post_date,
      modifiedTime: post.post_modified,
      authors: [authorName],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - ${groupName}`,
      description,
      images: [ogImage],
      creator: `@${post.author?.username || 'centimet2'}`,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    other: {
      'article:author': authorName,
      'article:published_time': post.post_date || '',
      'article:modified_time': post.post_modified || '',
      'article:section': groupName,
      ...(FB_APP_ID && { 'fb:app_id': FB_APP_ID }),
    },
  };
}

// Page component
export default async function GroupPostDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  return <GroupPostDetailClient postId={id} />;
}
