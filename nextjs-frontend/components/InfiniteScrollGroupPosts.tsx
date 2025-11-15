'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { groupPosts, GroupPost, ApiException, users, User } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GroupEngagementProvider } from '@/contexts/GroupEngagementContext';
import { GroupEngagementButtons } from '@/components/GroupEngagementButtons';

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

  // Show empty state
  if (!loading && postsList.length === 0 && !error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No posts yet</h3>
        <p className="text-gray-500 mb-6">Be the first to post in this group!</p>
        <Link
          href={`/groups/${groupId}/create-post`}
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Post
        </Link>
      </div>
    );
  }

  return (
    <GroupEngagementProvider token={localStorage.getItem('api_token') || ''}>
      <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {postsList.map((post) => (
        <div
          key={post.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Featured Image */}
          {post.featured_image && (
            <div className="h-64 bg-gray-200 overflow-hidden">
              <img
                src={post.featured_image}
                alt={post.post_title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Post Content */}
          <div className="p-6">
            {/* Author Info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              {post.author?.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{post.author?.name || post.author?.username || 'Anonymous'}</p>
                <p className="text-sm text-gray-600">
                  {new Date(post.post_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Post Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600">
                  <button
                    onClick={() => handleViewPost(post.id)}
                    className="text-left hover:underline"
                  >
                    {post.post_title}
                  </button>
                </h2>
              </div>

              {/* Post Menu */}
              {user && (user.id === post.post_author) && (
                <div className="relative" ref={(el) => { menuRefs.current[post.id] = el; }}>
                  <button
                    onClick={() => toggleMenu(post.id)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Post options"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                    </svg>
                  </button>

                  {openMenuId === post.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20 py-1">
                      <button
                        onClick={() => handleViewPost(post.id)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 text-blue-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Post
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Post Excerpt */}
            {post.post_excerpt && (
              <p className="text-gray-700 mb-4 line-clamp-2">{post.post_excerpt}</p>
            )}

            {/* Post Content Preview */}
            {post.post_content && (
              <div className="text-gray-600 mb-4 line-clamp-3 whitespace-pre-wrap">
                {post.post_content}
              </div>
            )}

            {/* Image Gallery Preview */}
            {post.images && post.images.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-2">
                {post.images.slice(0, 3).map((image, index) => (
                  <div key={index} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={image}
                      alt={`${post.post_title} - Image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 cursor-pointer"
                      onClick={() => handleViewPost(post.id)}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
                {post.images.length > 3 && (
                  <div className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                    <button
                      onClick={() => handleViewPost(post.id)}
                      className="text-center text-gray-600 hover:text-gray-800"
                    >
                      <span className="text-2xl font-bold">+{post.images.length - 3}</span>
                      <p className="text-xs">more</p>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Engagement Stats & Buttons Section */}
            <div className="space-y-4">
              {/* Stats Bar - Colorful Cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* Likes Card */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center hover:bg-blue-100 transition-colors">
                  <div className="text-2xl font-bold text-blue-600">👍</div>
                  <div className="text-lg font-bold text-blue-900 mt-1">{post.likes_count || 0}</div>
                  <div className="text-xs text-blue-700 font-medium mt-0.5">Likes</div>
                </div>

                {/* Dislikes Card */}
                <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center hover:bg-red-100 transition-colors">
                  <div className="text-2xl font-bold text-red-600">👎</div>
                  <div className="text-lg font-bold text-red-900 mt-1">{post.dislikes_count || 0}</div>
                  <div className="text-xs text-red-700 font-medium mt-0.5">Dislikes</div>
                </div>

                {/* Comments Card */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center hover:bg-green-100 transition-colors">
                  <div className="text-2xl font-bold text-green-600">💬</div>
                  <div className="text-lg font-bold text-green-900 mt-1">{post.comments_count || 0}</div>
                  <div className="text-xs text-green-700 font-medium mt-0.5">Comments</div>
                </div>
              </div>

              {/* Engagement Buttons */}
              {user ? (
                <div className="space-y-2">
                  <GroupEngagementButtons
                    postId={post.id}
                    postTitle={post.post_title}
                  />
                  <button
                    onClick={() => handleViewPost(post.id)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    View Full Post & Comments
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleViewPost(post.id)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  View Full Post
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Observer target for infinite scroll */}
      <div ref={observerTarget} className="py-8 text-center text-gray-500">
        {!hasMore && postsList.length > 0 && <p>No more posts to load</p>}
      </div>
      </div>
    </GroupEngagementProvider>
  );
}
