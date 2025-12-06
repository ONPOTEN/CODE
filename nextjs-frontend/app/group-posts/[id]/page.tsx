import { Metadata } from 'next';
import GroupPostDetailClient from './GroupPostDetailClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com';
const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || 'https://centimet2.com:8000';

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
    const response = await fetch(`${API_BASE_URL}/group-posts/${id}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error fetching group post for metadata:', error);
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
    return {
      title: 'Bài viết không tìm thấy | Centimet2',
      description: 'Bài viết này không tồn tại hoặc đã bị xóa.',
    };
  }

  // Get the image for OG - use Laravel share image
  const ogImage = `${LARAVEL_URL}/share-image/${post.id}`;

  // Get first post image as fallback
  const firstImage = post.images && post.images.length > 0 ? post.images[0] : undefined;

  const title = post.post_title || 'Bài viết nhóm';
  const description = post.post_excerpt || post.post_content?.substring(0, 160).replace(/<[^>]*>/g, '') || 'Xem bài viết nhóm trên Centimet2';
  const authorName = post.author?.display_name || post.author?.name || post.author?.username || 'Centimet2 User';
  const groupName = post.group?.group_name || 'Nhóm';
  const postUrl = `${SITE_URL}/group-posts/${post.id}`;

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
          width: 1200,
          height: 630,
          alt: title,
        },
        // Include first image as fallback
        ...(firstImage ? [{
          url: firstImage,
          width: 800,
          height: 600,
          alt: title,
        }] : []),
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
      canonical: postUrl,
    },
    other: {
      'article:author': authorName,
      'article:published_time': post.post_date || '',
      'article:modified_time': post.post_modified || '',
      'article:section': groupName,
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
