'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { posts, Post, ApiException } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EngagementButtons } from '@/components/EngagementButtons';
import { AuthorCard } from '@/components/AuthorCard';

export default function InfiniteScrollPosts() {
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const router = useRouter();
  const { user } = useAuth();

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
    router.push(`/posts/${postId}/edit`);
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
      <section className="container py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Posts</h3>
          <p className="text-red-700">{error}</p>
          <p className="text-sm text-red-600 mt-2">
            Make sure your Laravel API is running on http://localhost:8000
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-12 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Posts API</h2>

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
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Featured Image or Placeholder */}
                    <div className="md:w-1/3 h-48 md:h-auto relative bg-gray-200 overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-t-none">
                      <Link href={`/posts/${post.id}`}>
                        {featuredImageUrl ? (
                          <img
                            src={featuredImageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            onError={(e) => {
                              // Fallback if image fails to load
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.parentElement) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400';
                                placeholder.innerHTML = `
                                  <svg class="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                `;
                                e.currentTarget.parentElement.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 hover:opacity-90 transition-opacity">
                            <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </Link>
                    </div>

                    {/* Content */}
                    <div className={`p-6 flex-1 ${!featuredImageUrl ? 'w-full' : ''}`}>
                      {/* Title */}
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-2xl font-semibold text-gray-900 hover:text-blue-600 transition-colors flex-1">
                          <Link href={`/posts/${post.id}`}>{post.title}</Link>
                        </h3>
                        <div className="flex items-center gap-2 ml-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                            post.status === 'publish'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {post.status}
                          </span>

                          {/* Privacy indicator */}
                          {post.visibility === 'private' && (
                            <span className="px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap bg-gray-100 text-gray-800 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Private
                            </span>
                          )}

                          {/* 3-dot menu button */}
                          <div className="relative" ref={(el) => { menuRefs.current[post.id] = el; }}>
                            <button
                              onClick={() => toggleMenu(post.id)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              aria-label="Post options"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>

                            {/* Dropdown menu */}
                            {openMenuId === post.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <button
                                  onClick={() => handleSavePost(post.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill={savedPosts.has(post.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                  {savedPosts.has(post.id) ? 'Unsave' : 'Save'}
                                </button>

                                {/* Privacy toggle */}
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                  onClick={() => handleToggleVisibility(post.id, post.visibility === 'private' ? 'public' : 'private')}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  {post.visibility === 'private' ? (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Make Public
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                      Make Private
                                    </>
                                  )}
                                </button>
                                <div className="border-t border-gray-200 my-1"></div>

                                <button
                                  onClick={() => handleEditPost(post.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Author Card */}
                      {post.author && (
                        <AuthorCard
                          author={post.author}
                          createdAt={post.created_at}
                          compact={true}
                          showAvatar={true}
                        />
                      )}

                      {post.excerpt && (
                        <p className="text-gray-700 mb-4 line-clamp-3">{post.excerpt}</p>
                      )}

                      {/* Engagement Buttons */}
                      <div className="mb-4 py-4 border-t border-gray-100">
                        <EngagementButtons
                          postId={post.id}
                          postTitle={post.title}
                          postSlug={post.slug}
                          postText={post.excerpt}
                          showLabels={true}
                          compact={true}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {post.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                          {post.images && post.images.length > 1 && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              +{post.images.length - 1}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/posts/${post.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                        >
                          Read more →
                        </Link>
                      </div>
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
