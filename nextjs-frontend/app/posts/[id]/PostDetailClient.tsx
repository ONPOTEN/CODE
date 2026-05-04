'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { posts, Post, ApiException, settings, ImageSettings, VideoSettings } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { EngagementButtons } from '@/components/EngagementButtons';
import { CommentsSection } from '@/components/CommentsSection';
import { AuthorCard } from '@/components/AuthorCard';
import VideoPlayer from '@/components/VideoPlayer';

interface PostDetailClientProps {
  postId: string;
}

export default function PostDetailClient({ postId }: PostDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [imageSettings, setImageSettings] = useState<ImageSettings>({
    image_width: 1200,
    image_height: 1200,
    image_quality: 80,
    max_file_size: 10,
  });
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    video_width: 1920,
    video_height: 1080,
    video_max_file_size: 100,
  });

  const shouldScrollToComments = searchParams.get('scrollToComments') === 'true';

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [imageResponse, videoResponse] = await Promise.all([
          settings.getImageSettings(),
          settings.getVideoSettings(),
        ]);
        if (imageResponse.success) {
          setImageSettings(imageResponse.data);
        }
        if (videoResponse.success) {
          setVideoSettings(videoResponse.data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Process img tags to add width/height from settings
  const processImgTags = (content: string): string => {
    return content.replace(/<img\s+([^>]*)>/gi, (_match, attributes) => {
      const maxWidthStyle = `max-width: ${imageSettings.image_width}px`;
      const maxHeightStyle = `max-height: ${imageSettings.image_height}px`;

      // Check if style attribute exists
      if (/style\s*=\s*["']/i.test(attributes)) {
        // Add to existing style
        const newAttributes = attributes.replace(
          /style\s*=\s*["']([^"']*)["']/i,
          (_styleMatch: string, styleContent: string) => {
            return `style="${styleContent}; ${maxWidthStyle}; ${maxHeightStyle}; width: auto; height: auto;"`;
          }
        );
        return `<img ${newAttributes}>`;
      } else {
        // Add new style attribute
        return `<img ${attributes} style="${maxWidthStyle}; ${maxHeightStyle}; width: auto; height: auto;">`;
      }
    });
  };

  // Process video URLs and iframes to add responsive container with settings dimensions
  const processVideoContent = (content: string): string => {
    const aspectRatio = (videoSettings.video_height / videoSettings.video_width) * 100;
    const wrapperStyle = `position: relative; width: 100%; max-width: ${videoSettings.video_width}px; padding-bottom: ${aspectRatio}%; height: 0; overflow: hidden; margin: 10px 0; background: #000;`;
    const iframeStyle = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;`;

    const createResponsiveContainer = (iframeSrc: string, allow: string) => {
      return `<div class="video-container" style="${wrapperStyle}"><iframe src="${iframeSrc}" style="${iframeStyle}" frameborder="0" allow="${allow}" allowfullscreen></iframe></div>`;
    };

    let processedContent = content;

    // First, process existing iframes that contain video URLs
    // Match iframes with YouTube, Vimeo, Facebook, or TikTok sources
    processedContent = processedContent.replace(
      /<iframe[^>]*src=["']([^"']*(?:youtube|vimeo|facebook|tiktok)[^"']*)["'][^>]*>[\s\S]*?<\/iframe>/gi,
      (match, src) => {
        // Skip if already wrapped in a video-container
        if (match.includes('video-container')) return match;

        let allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        if (src.includes('vimeo')) {
          allow = 'autoplay; fullscreen; picture-in-picture';
        } else if (src.includes('facebook')) {
          allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';
        }
        return createResponsiveContainer(src, allow);
      }
    );

    // Process standalone YouTube URLs (not inside iframe src or href attributes)
    // Only match URLs that are NOT preceded by src=" or href="
    processedContent = processedContent.replace(
      /(?<!src=["']|href=["'])(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s<"']*)?/gi,
      (_match, videoId) => {
        return createResponsiveContainer(
          `https://www.youtube.com/embed/${videoId}`,
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        );
      }
    );

    // Process standalone Vimeo URLs
    processedContent = processedContent.replace(
      /(?<!src=["']|href=["'])(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?:[^\s<"']*)?/gi,
      (_match, videoId) => {
        return createResponsiveContainer(
          `https://player.vimeo.com/video/${videoId}`,
          'autoplay; fullscreen; picture-in-picture'
        );
      }
    );

    // Process standalone Facebook video URLs
    processedContent = processedContent.replace(
      /(?<!src=["']|href=["'])(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch)\/(?:watch\/?\?v=|video\.php\?v=|[^\/]+\/videos\/)(\d+)(?:[^\s<"']*)?/gi,
      (_match, videoId) => {
        const fbUrl = encodeURIComponent(`https://www.facebook.com/video.php?v=${videoId}`);
        return createResponsiveContainer(
          `https://www.facebook.com/plugins/video.php?href=${fbUrl}&show_text=false`,
          'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share'
        );
      }
    );

    // Process standalone TikTok URLs
    processedContent = processedContent.replace(
      /(?<!src=["']|href=["'])(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[^\/]+\/video\/|vm\.tiktok\.com\/)(\d+)(?:[^\s<"']*)?/gi,
      (_match, videoId) => {
        return createResponsiveContainer(
          `https://www.tiktok.com/embed/v2/${videoId}`,
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        );
      }
    );

    return processedContent;
  };

  // Process links: convert plain URLs to clickable links and style existing <a> tags
  const processLinks = (content: string): string => {
    let processedContent = content;

    // First, add target="_blank" and proper styling to existing <a> tags
    processedContent = processedContent.replace(
      /<a\s+([^>]*)>/gi,
      (match, attributes) => {
        const hrefMatch = attributes.match(/href\s*=\s*["']([^"']*)["']/i);
        const href = hrefMatch ? hrefMatch[1] : '';

        // Determine if external link (starts with http or has no protocol)
        const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.match(/^(?!\/)/);

        // Check if already has target attribute
        if (/target\s*=/i.test(attributes)) {
          // Already has target, just ensure styling
          if (/class\s*=/i.test(attributes)) {
            return `<a ${attributes.replace(/class\s*=\s*["']([^"']*)["']/i, 'class="$1 text-blue-600 hover:text-blue-800 underline"')}>`;
          }
          return `<a ${attributes} class="text-blue-600 hover:text-blue-800 underline">`;
        }

        // Add target="_blank" for external links
        const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';

        // Add styling
        if (/class\s*=/i.test(attributes)) {
          const newAttributes = attributes.replace(
            /class\s*=\s*["']([^"']*)["']/i,
            'class="$1 text-blue-600 hover:text-blue-800 underline"'
          );
          return `<a ${newAttributes}${targetAttr}>`;
        }
        return `<a ${attributes} class="text-blue-600 hover:text-blue-800 underline"${targetAttr}>`;
      }
    );

    // Process custom link syntax: href=https://...,text:LinkText
    // Match the pattern and convert to <a> tag
    const customLinkRegex = /href=([^\s<>,]+),text:([^\s<>,]+)/gi;
    processedContent = processedContent.replace(customLinkRegex, (match, url, text) => {
      const fullUrl = url.startsWith('www.') ? `https://${url}` : url;
      return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${text}</a>`;
    });

    // Then, convert plain text URLs to clickable links
    // Only match URLs that are NOT inside HTML tags (src=", href=", <a>, etc.)
    // Match http://, https://, and www. URLs with complex query parameters
    // The pattern matches URLs with or without query parameters, handling special characters
    const urlRegex = /(?<![a-zA-Z0-9="'\/])(https?:\/\/(?:www\.)?[^\s<>"'`]+|www\.[^\s<>"'`]+)/gi;

    processedContent = processedContent.replace(urlRegex, (url) => {
      // Clean up trailing punctuation that's not part of the URL
      let cleanUrl = url.replace(/[.,;:!?]+$/, '');
      const fullUrl = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
      return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${cleanUrl}</a>`;
    });

    return processedContent;
  };

  const normalizeContent = (content: string | undefined): string => {
    if (!content) return '';

    // Normalize line breaks: convert \n to <br>, preserve <br> and <div> tags
    let normalizedContent = content
      .replace(/\n/g, '<br>')  // Convert newlines to <br>
      .replace(/<\/div>\s*<div>/gi, '<br>')  // Convert consecutive divs to line breaks
      .replace(/<div>/gi, '')  // Remove opening div tags
      .replace(/<\/div>/gi, '<br>');  // Convert closing div to <br>

    // Clean up multiple consecutive <br> tags
    normalizedContent = normalizedContent
      .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')  // Max 2 line breaks
      .replace(/^(<br\s*\/?>\s*)+/gi, '')  // Remove leading <br>
      .replace(/(<br\s*\/?>\s*)+$/gi, '');  // Remove trailing <br>

    // Process images with settings dimensions
    normalizedContent = processImgTags(normalizedContent);

    // Process video URLs and iframes with settings dimensions
    normalizedContent = processVideoContent(normalizedContent);

    // Process links (convert plain URLs to clickable links)
    normalizedContent = processLinks(normalizedContent);

    return normalizedContent;
  };

  useEffect(() => {
    async function fetchPost() {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching post with ID/slug:', postId);

        // Try to fetch by ID first (if it's a number), otherwise fetch by slug
        let postData;
        const numericId = parseInt(postId);

        if (!isNaN(numericId) && numericId.toString() === postId) {
          // It's a numeric ID
          console.log('Fetching by ID:', numericId);
          postData = await posts.getById(numericId);
        } else {
          // It's a slug
          console.log('Fetching by slug:', postId);
          postData = await posts.getBySlug(postId);
        }
        // postData should already be a Post object or wrapped in {data} response
        if (postData && typeof postData === 'object' && 'data' in postData) {
          postData = (postData as any).data;
        }
        console.log('Fetched post data:', postData);
        console.log('Post ID:', postData.id);
        console.log('Post slug:', postData.slug);
        console.log('Post content:', postData.content);
        console.log('Post featured_image:', postData.featured_image);
        console.log('Post images array:', postData.images);
        console.log('Images is array?', Array.isArray(postData.images));
        console.log('Images length:', postData.images?.length);

        setPost(postData);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`Không thể tải bài viết: ${err.message}`);
        } else {
          setError('Không thể tải bài viết');
        }
        console.error('Error fetching post:', err);
      } finally {
        setLoading(false);
      }
    }

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  // Scroll to comments section when shouldScrollToComments is true
  useEffect(() => {
    if (shouldScrollToComments && post) {
      setTimeout(() => {
        const commentsElement = document.querySelector('[data-comments-section]');
        if (commentsElement) {
          commentsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [shouldScrollToComments, post]);

  // Register post as owned for toast notifications when user is viewing their own post
  useEffect(() => {
    if (post && user && post.author?.id === user.id) {
      console.log('[PostDetailClient] User viewing own post, registering for toast notifications:', post.id);
      if ((window as any).__markPostAsOwned) {
        (window as any).__markPostAsOwned(post.id);
      }
    }

    // Cleanup - unregister post when leaving
    return () => {
      if (post && (window as any).__unmarkPostAsOwned) {
        (window as any).__unmarkPostAsOwned(post.id);
      }
    };
  }, [post, user]);

  const handleDelete = async () => {
    if (!post) return;

    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.'
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      await posts.delete(post.id);
      router.push('/my-posts');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Không thể xóa bài viết: ${err.message}`);
      } else {
        alert('Không thể xóa bài viết');
      }
      console.error('Error deleting post:', err);
      setDeleting(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!post?.images || post.images.length <= 1) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50; // Minimum distance to trigger swipe

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left - show next image
        setSelectedImageIndex((prev) => (prev === (post.images?.length || 1) - 1 ? 0 : prev + 1));
      } else {
        // Swiped right - show previous image
        setSelectedImageIndex((prev) => (prev === 0 ? (post.images?.length || 1) - 1 : prev - 1));
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }
  //console.log(post.images[1]);
  if (error || !post) {
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-grey-200 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Lỗi</h2>
            <p className="text-red-700">{error || 'Không tìm thấy bài viết'}</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Quay lại Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }
  //console.log(post.images);
  const isOwner = user?.id === post.id; // You may need to adjust this based on your Post interface

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Quay lại Bài viết
        </Link>

        {/* Post Content */}
        <article className="bg-grey-200 rounded-lg shadow-lg overflow-hidden border border-gray-300 w-full">
          <div className="w-full">
            {/* Header */}
            <header className="">
              {/* Author Card */}
              {post.author && (
                <div className="">
                  <AuthorCard
                    author={post.author}
                    createdAt={post.created_at}
                    compact={false}
                    showAvatar={false}
                  />
                </div>
              )}
            </header>

            {/* Content - Displayed before images */}
            <div className="px-4">
              <div className="prose prose-lg max-w-none prose-video">
                <div
                  className="text-gray-800 leading-normal bg-white rounded-lg post-content"
                  dangerouslySetInnerHTML={{ __html: normalizeContent(post.content) || 'Không có nội dung.' }}
                />
              </div>
            </div>

            {/* Additional Images Carousel */}
            {post.images && post.images.length > 0 && (
              <div className="px-4">
                {/* Main Carousel */}
                <div
                  className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 cursor-grab active:cursor-grabbing"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <img
                    src={typeof post.images[selectedImageIndex] === 'string' ? post.images[selectedImageIndex] : post.images[selectedImageIndex]?.url || ''}
                    alt={`${post.title} - Image ${selectedImageIndex + 1}`}
                    className="w-full h-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.style.display = 'none';
                    }}
                  />

                  {/* Image Counter */}
                  <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {selectedImageIndex + 1} / {post.images?.length || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Video Player */}
            {post.video && (
              <div className="mb-4 px-4 md:px-8">
                <VideoPlayer
                  src={post.video}
                  title={post.title}
                  poster={post.featured_image || (post.images && post.images.length > 0 ? (typeof post.images[0] === 'string' ? post.images[0] : post.images[0]?.url) : undefined)}
                  className=""
                />
              </div>
            )}

            {/* Debug info for images */}
            {(!post.images || !Array.isArray(post.images) || post.images.length === 0) && !post.video && (
              <div className="mb-8 p-4 bg-white border border-gray-300 rounded-lg mx-4 md:mx-8">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Gỡ lỗi:</span> Không tìm thấy mảng hình ảnh bổ sung.
                  {post.featured_image && ' (Ảnh nổi bật được hiển thị ở trên)'}
                </p>
              </div>
            )}

            {/* Engagement Buttons */}
            <div className="mb-8 px-4 md:px-8 border-t border-gray-300 pt-4">
              <EngagementButtons
                postId={post.id}
                postTitle={post.title}
                postSlug={post.slug}
                postText={post.excerpt || post.content?.substring(0, 200)}
                showLabels={true}
              />
            </div>

            {/* Comments Section */}
            <div className="mb-8 px-4 md:px-8 border-t border-gray-300 flex flex-col" data-comments-section>
              <CommentsSection postId={post.id} currentUserId={user?.id} postOwnerId={post.author?.id} className="mt-6" />
            </div>

            {/* Action Buttons */}
            {isOwner && (
              <div className="flex gap-3 px-4 md:px-8 border-t border-gray-300 pt-4">
                <Link
                  href={`/posts/edit/${post.id}`}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
                >
                  Sửa bài viết
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Đang xóa...' : 'Xóa bài viết'}
                </button>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
