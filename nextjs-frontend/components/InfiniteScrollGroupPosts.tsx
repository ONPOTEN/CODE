'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { groupPosts, GroupPost, ApiException, users, User } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GroupEngagementProvider } from '@/contexts/GroupEngagementContext';
import { GroupEngagementButtons } from '@/components/GroupEngagementButtons';

// Image Carousel Component with touch/swipe support
function ImageCarousel({ images, postId, onImageClick }: { images: string[]; postId: number; onImageClick: () => void }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe(e);
  };

  const handleSwipe = (e: React.TouchEvent) => {
    if (images.length <= 1) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left - show next image
        setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      } else {
        // Swiped right - show previous image
        setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
    }
  };

  return (
    <div
      className="w-full overflow-hidden mt-3 rounded-lg bg-gray-900 cursor-grab active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative aspect-video flex items-center justify-center bg-black">
        <img
          src={images[selectedImageIndex]}
          alt={`Image ${selectedImageIndex + 1}`}
          className="w-full h-full object-contain"
          onClick={onImageClick}
          onError={(e) => {
            e.currentTarget.src = '';
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
            {selectedImageIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 p-2 bg-gray-900 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImageIndex === index
                  ? 'border-blue-500 opacity-100'
                  : 'border-gray-600 opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '';
                  e.currentTarget.style.display = 'none';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface InfiniteScrollGroupPostsProps {
  groupId: number;
  onPostDeleted?: (postId: number) => void;
  sortBy?: 'post_date' | 'comment_count';
  order?: 'asc' | 'desc';
}

export default function InfiniteScrollGroupPosts({
  groupId,
  onPostDeleted,
  sortBy = 'post_date',
  order = 'desc',
}: InfiniteScrollGroupPostsProps) {
  const [postsList, setPostsList] = useState<GroupPost[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const userCache = useRef<Map<number, User>>(new Map());
  const router = useRouter();
  const { user } = useAuth();

  const getTruncatedContent = (content: string | undefined, wordLimit: number = 50): string => {
    if (!content) return '';
    const words = content.trim().split(/\s+/);
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '...';
    }
    return content;
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

  const fetchAuthorData = useCallback(
    async (post: GroupPost): Promise<GroupPost> => {
      // If author data is already present with a name, return post as-is
      if (post.author && (post.author.name || post.author.username)) {
        return post;
      }

      // If post_author ID exists, try to fetch user data
      if (post.post_author) {
        try {
          // Check cache first
          if (userCache.current.has(post.post_author)) {
            const cachedUser = userCache.current.get(post.post_author)!;
            return { ...post, author: cachedUser };
          }

          // Fetch from API
          const userResponse = await users.getById(post.post_author);
          // Handle both direct User response and wrapped response
          const userData = (userResponse as any).data || userResponse;
          console.log(`[fetchAuthorData] Fetched user for post ${post.id}:`, userData);
          userCache.current.set(post.post_author, userData);
          return { ...post, author: userData };
        } catch (err) {
          console.error(`Failed to fetch author data for post ${post.id}:`, err);
          // Return post as-is if fetch fails
          return post;
        }
      }

      return post;
    },
    []
  );

  const fetchPosts = useCallback(
    async (pageNum: number) => {
      if (loading) return;

      try {
        setLoading(true);
        setError(null);

        const response = await groupPosts.getByGroupId(groupId, {
          per_page: 10,
          page: pageNum,
          status: 'publish',
          sort_by: sortBy,
          order: order,
        });

        if (response.data.length === 0) {
          setHasMore(false);
        } else {
          // Fetch author data for posts that don't have it
          const postsWithAuthors = await Promise.all(
            response.data.map((post) => fetchAuthorData(post))
          );

          setPostsList((prev) => {
            // Avoid duplicates
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = postsWithAuthors.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });

          // Check if there are more pages
          if (response.meta) {
            setHasMore(pageNum < response.meta.last_page);
          }
        }
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`Failed to load posts: ${err.message}`);
        } else {
          setError('Failed to load posts');
        }
        console.error('Fetch posts error:', err);
      } finally {
        setLoading(false);
      }
    },
    [groupId, loading, sortBy, order, fetchAuthorData]
  );

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

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await groupPosts.delete(postId);
      setPostsList((prev) => prev.filter((post) => post.id !== postId));
      setOpenMenuId(null);
      if (onPostDeleted) {
        onPostDeleted(postId);
      }
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Failed to delete post: ${err.message}`);
      } else {
        alert('Failed to delete post');
      }
      console.error('Delete error:', err);
    }
  };

  const handleViewPost = (postId: number) => {
    setOpenMenuId(null);
    router.push(`/group-posts/${postId}`);
  };

  // Initial load
  useEffect(() => {
    setPostsList([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(1);
  }, [groupId, sortBy, order]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [page, hasMore, loading, fetchPosts]);

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
    <GroupEngagementProvider token={localStorage.getItem('api_token') || ''}>
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
                            {getRelativeTime(post.post_date)}
                          </span>
                        </div>

                        {/* Menu Button */}
                        {user && user.id === post.post_author && (
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
                                  onClick={() => handleViewPost(post.id)}
                                  className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  View
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
                        )}
                      </div>

                      {/* Title */}
                      {post.post_title && (
                        <Link href={`/group-posts/${post.id}`}>
                          <h2 className="mt-2 text-base md:text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors break-words">
                            {post.post_title}
                          </h2>
                        </Link>
                      )}

                      {/* Content */}
                      {post.post_content && (
                        <Link href={`/group-posts/${post.id}`}>
                          <p className="mt-2 text-base md:text-lg text-gray-800 whitespace-pre-line break-words hover:text-blue-600 cursor-pointer transition-colors">
                            {getTruncatedContent(post.post_content, 50)}
                          </p>
                        </Link>
                      )}

                      {/* Images Carousel */}
                      {post.images && post.images.length > 0 && (
                        <ImageCarousel
                          images={post.images}
                          postId={post.id}
                          onImageClick={() => handleViewPost(post.id)}
                        />
                      )}

                      {/* Engagement buttons */}
                      <div className="flex gap-6 mt-3 text-gray-600">
                        <GroupEngagementButtons
                          postId={post.id}
                          postTitle={post.post_title}
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
    </GroupEngagementProvider>
  );
}
