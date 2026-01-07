'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { posts, Post, ApiException, settings, ImageSettings, VideoSettings } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EngagementButtons } from '@/components/EngagementButtons';
import { AuthorCard } from '@/components/AuthorCard';
import { ImageCarousel } from '@/components/ImageCarousel';
import VideoPlayer from '@/components/VideoPlayer';

export default function InfiniteScrollPosts() {
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
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
  const observerTarget = useRef<HTMLDivElement>(null);
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const router = useRouter();
  const { user } = useAuth();

  // Fetch image and video settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [imageResponse, videoResponse] = await Promise.all([
          settings.getImageSettings(),
          settings.getVideoSettings(),
        ]);
        if (imageResponse.success && imageResponse.data) {
          setImageSettings(imageResponse.data);
        }
        if (videoResponse.success && videoResponse.data) {
          setVideoSettings(videoResponse.data);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Process video URLs and iframes to embed videos with settings dimensions
  const processVideoContent = (content: string): string => {
    if (!content) return '';

    const aspectRatio = (videoSettings.video_height / videoSettings.video_width) * 100;
    const wrapperStyle = `position: relative; width: 100%; max-width: ${videoSettings.video_width}px; padding-bottom: ${aspectRatio}%; height: 0; overflow: hidden; margin: 10px 0; background: #000;`;
    const iframeStyle = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;`;

    const createResponsiveContainer = (iframeSrc: string, allow: string) => {
      return `<div class="video-container" style="${wrapperStyle}"><iframe src="${iframeSrc}" style="${iframeStyle}" frameborder="0" allow="${allow}" allowfullscreen></iframe></div>`;
    };

    let processedContent = content;

    // First, process existing iframes that contain video URLs
    processedContent = processedContent.replace(
      /<iframe[^>]*src=["']([^"']*(?:youtube|vimeo|facebook|tiktok)[^"']*)["'][^>]*>[\s\S]*?<\/iframe>/gi,
      (match, src) => {
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

  // Process img tags to add width/height from settings
  const processImgTags = (content: string): string => {
    if (!content) return '';

    // Match img tags and add width/height attributes
    return content.replace(/<img\s+([^>]*)>/gi, (match, attributes) => {
      // Check if width/height already exist
      const hasWidth = /width\s*=/i.test(attributes);
      const hasHeight = /height\s*=/i.test(attributes);

      let newAttributes = attributes;

      // Add style for max-width and max-height based on settings
      const styleMatch = attributes.match(/style\s*=\s*["']([^"']*)["']/i);
      let existingStyle = styleMatch ? styleMatch[1] : '';

      // Build new style with max dimensions
      const maxWidthStyle = `max-width: ${imageSettings.image_width}px`;
      const maxHeightStyle = `max-height: ${imageSettings.image_height}px`;
      const additionalStyles = `${maxWidthStyle}; ${maxHeightStyle}; width: 100%; height: auto; object-fit: contain;`;

      if (styleMatch) {
        // Append to existing style
        newAttributes = newAttributes.replace(
          /style\s*=\s*["']([^"']*)["']/i,
          `style="${existingStyle}; ${additionalStyles}"`
        );
      } else {
        // Add new style attribute
        newAttributes = `${newAttributes} style="${additionalStyles}"`;
      }

      return `<img ${newAttributes}>`;
    });
  };

  const getTruncatedContent = (content: string | undefined, wordLimit: number = 50): string => {
    if (!content) return '';

    // Normalize line breaks: convert \n to <br>, preserve <br> and <div> tags
    let normalizedContent = content
      .replace(/\n/g, '<br>')  // Convert newlines to <br>
      .replace(/<\/div>\s*<div>/gi, '<br>')  // Convert consecutive divs to line breaks
      .replace(/<div>/gi, '')  // Remove opening div tags
      .replace(/<\/div>/gi, '<br>');  // Convert closing div to <br>

    // Process img tags to add width/height from settings
    normalizedContent = processImgTags(normalizedContent);

    // Process video URLs and iframes (YouTube, Vimeo, Facebook, TikTok)
    normalizedContent = processVideoContent(normalizedContent);

    // Strip HTML tags for word counting
    const textOnly = normalizedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = textOnly.split(/\s+/).filter(w => w.length > 0);

    if (words.length > wordLimit) {
      // Truncate and add ellipsis
      const truncatedText = words.slice(0, wordLimit).join(' ') + '...';
      return truncatedText;
    }

    // Clean up multiple consecutive <br> tags
    normalizedContent = normalizedContent
      .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')  // Max 2 line breaks
      .replace(/^(<br\s*\/?>\s*)+/gi, '')  // Remove leading <br>
      .replace(/(<br\s*\/?>\s*)+$/gi, '');  // Remove trailing <br>

    return normalizedContent;
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (secondsAgo < 60) return 'just now';
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
    if (secondsAgo < 2592000) return `${Math.floor(secondsAgo / 604800)}w ago`;
    return `${Math.floor(secondsAgo / 2592000)}mo ago`;
  };

  const fetchPosts = useCallback(async (pageNum: number) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const response = await posts.getAll({
        per_page: 10,
        page: pageNum,
        sort: 'created_at',
        order: 'desc'
      });

      if (response.data.length === 0) {
        setHasMore(false);
      } else {
        setPostsList((prev) => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = response.data.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });

        // Check if there are more pages
        if (response.meta) {
          setHasMore(pageNum < response.meta.last_page);
        }
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch posts');
      }
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null && menuRefs.current[openMenuId]) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const toggleMenu = (postId: number) => {
    setOpenMenuId(openMenuId === postId ? null : postId);
  };

  const handleSavePost = (postId: number) => {
    setSavedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    setOpenMenuId(null);
    alert(savedPosts.has(postId) ? 'Post unsaved!' : 'Post saved!');
  };

  const handleEditPost = (postId: number) => {
    setOpenMenuId(null);
    router.push(`/posts/edit/${postId}`);
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await posts.delete(postId);
      setPostsList((prev) => prev.filter((post) => post.id !== postId));
      setOpenMenuId(null);
      alert('Post deleted successfully!');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Failed to delete post: ${err.message}`);
      } else {
        alert('Failed to delete post');
      }
      console.error('Delete error:', err);
    }
  };

  const handleToggleVisibility = async (postId: number, newVisibility: string) => {
    try {
      await posts.update(postId, { visibility: newVisibility as 'public' | 'private' });

      // Update the post in the list
      setPostsList((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, visibility: newVisibility } : post
        )
      );

      setOpenMenuId(null);
      alert(`Post visibility changed to ${newVisibility}!`);
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Failed to update visibility: ${err.message}`);
      } else {
        alert('Failed to update visibility');
      }
      console.error('Visibility update error:', err);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchPosts(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, fetchPosts]);

  if (error && postsList.length === 0) {
    return (
      <section className="w-full px-2 md:px-4 py-6 md:py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 max-w-4xl mx-auto">
          <h3 className="text-base md:text-lg font-semibold text-red-900 mb-2">Error Loading Posts</h3>
          <p className="text-sm md:text-base text-red-700">{error}</p>
          <p className="text-xs md:text-sm text-red-600 mt-2">
            Make sure your Laravel API is running on http://localhost:8000
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full px-2 md:px-4 py-6 md:py-12 bg-white">
      <div className="w-full max-w-4xl mx-auto">
        
        {postsList.length === 0 && !loading ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-lg">No posts available yet.</p>
            <p className="text-sm mt-2">Be the first to create a post!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {postsList.map((post) => {
              // Prioritize featured_image, fallback to first image in images array
              const featuredImageUrl = post.featured_image ||
                (post.images && post.images.length > 0 ? post.images[0].url : null);

              return (
                <article
  key={post.id}
  className="w-full border-b border-gray-200 pb-4 pt-6 flex gap-2 md:gap-3 overflow-hidden"
>
  {/* Avatar */}
  <div className="flex-shrink-0">
    <Link href={`/users/${post.author?.id}`}>
      <img
        src={post.author?.avatar || post.author?.avatar_url || "/default-avatar.png"}
        alt={post.author?.name}
        className="w-10 h-10 rounded-full object-cover"
      />
    </Link>
  </div>

  {/* Right Area */}
  <div className="flex-1 min-w-0 w-full">
    {/* Top row: Name + menu */}
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <Link href={`/users/${post.author?.id}`} className="font-semibold text-gray-900 text-sm md:text-base line-clamp-1">
          {post.author?.name || post.author?.username}
        </Link>
        <span className="text-xs md:text-sm text-gray-500">
          {getRelativeTime(post.created_at)}
        </span>
      </div>

      {/* Menu Button */}
      <div className="relative flex-shrink-0" ref={(el) => { menuRefs.current[post.id] = el; }}>
        <button
          onClick={() => toggleMenu(post.id)}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>

        {openMenuId === post.id && (
          <div className="absolute right-0 mt-2 w-32 md:w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
            <button
              onClick={() => handleSavePost(post.id)}
              className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-gray-700 hover:bg-gray-100"
            >
              {savedPosts.has(post.id) ? "Unsave" : "Save"}
            </button>
            <button
              onClick={() => handleToggleVisibility(post.id, post.visibility === "private" ? "public" : "private")}
              className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-gray-700 hover:bg-gray-100"
            >
              {post.visibility === "private" ? "Make public" : "Make private"}
            </button>
            <button
              onClick={() => handleEditPost(post.id)}
              className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-gray-700 hover:bg-gray-100"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeletePost(post.id)}
              className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Content */}
    {post.content && (
      <Link href={`/posts/${post.id}`}>
        <div
          className="mt-2 text-base md:text-lg text-gray-800 break-words hover:text-blue-600 cursor-pointer transition-colors prose prose-sm prose-video max-w-none post-content"
          dangerouslySetInnerHTML={{ __html: getTruncatedContent(post.content, 50) }}
        />
      </Link>
    )}

    {/* Images Carousel Slide */}
    {post.images && post.images.length > 0 && (
      <div className="w-full overflow-hidden">
        <ImageCarousel images={post.images} postId={post.id} />
      </div>
    )}

    {/* Video Player */}
    {post.video && (
      <div className="mt-3 w-full rounded-lg overflow-hidden">
        <VideoPlayer
          src={post.video}
          poster={post.featured_image || (post.images && post.images.length > 0 ? post.images[0].url : undefined)}
          className="aspect-video w-full"
        />
      </div>
    )}

    {/* Engagement buttons Threads style */}
    <div className="flex gap-6 mt-3 text-gray-600">
      <EngagementButtons
        postId={post.id}
        postTitle={post.title}
        postSlug={post.slug}
        postText={post.excerpt}
        compact={true}
        showLabels={false}
      />
    </div>
  </div>
</article>


              );
            })}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Observer target for infinite scroll */}
        {hasMore && !loading && <div ref={observerTarget} className="h-10" />}

        {/* No more posts message */}
        {!hasMore && postsList.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">You've reached the end of the posts</p>
          </div>
        )}

        {/* Error message while scrolling */}
        {error && postsList.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    </section>
  );
}
