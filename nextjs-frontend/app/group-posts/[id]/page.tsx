'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groupPosts, GroupPost, User, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { GroupEngagementProvider } from '@/contexts/GroupEngagementContext';
import { GroupEngagementButtons } from '@/components/GroupEngagementButtons';
import { GroupCommentsSection } from '@/components/GroupCommentsSection';

export default function GroupPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const postId = params.id as string;

  const [post, setPost] = useState<GroupPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await groupPosts.getById(parseInt(postId));
        setPost(response.data);
      } catch (err) {
        console.error('Error fetching group post:', err);
        if (err instanceof ApiException) {
          setError(`Failed to load post: ${err.message}`);
        } else {
          setError('Failed to load post');
        }
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  // Check if current user can delete this post (post author or group admin)
  const canDeletePost = currentUser && post && (
    currentUser.id === post.post_author ||
    currentUser.id === post.group?.group_owner_id
  );

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      setIsDeleting(true);
      await groupPosts.delete(parseInt(postId));
      setShowMenu(false);
      router.push(`/groups/${post?.group?.group_id}?message=Post deleted successfully`);
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post');
      setIsDeleting(false);
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
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left - show next image
        setSelectedImageIndex((prev) => (prev === post.images!.length - 1 ? 0 : prev + 1));
      } else {
        // Swiped right - show previous image
        setSelectedImageIndex((prev) => (prev === 0 ? post.images!.length - 1 : prev - 1));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-grey-200 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700 mb-4">{error || 'Post not found'}</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GroupEngagementProvider token={localStorage.getItem('api_token') || ''}>
      <div className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            href={post.group ? `/groups/${post.group_id}` : '/'}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
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
            Back to {post.group ? post.group.group_name : 'Group'}
          </Link>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 mb-8 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              Home
            </Link>
            <span className="text-gray-600">/</span>
            {post.group && (
              <>
                <Link
                  href={`/groups/${post.group_id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium truncate transition-colors"
                >
                  {post.group.group_name}
                </Link>
                <span className="text-gray-600">/</span>
              </>
            )}
            <span className="text-gray-600 truncate">{post.post_title?.substring(0, 30)}...</span>
          </div>

          {/* Main Content */}
          <article className="bg-grey-200 rounded-lg shadow-lg overflow-hidden border border-gray-300 w-full">
            <div className="w-full">
              {/* Header Section */}
              <header className="mb-8 pb-6 px-4 md:px-8">
                {/* Status Badges */}
                <div className="flex flex-col md:flex-row items-start justify-between mb-4 gap-4">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap flex-shrink-0 ${
                      post.post_status === 'publish'
                        ? 'bg-blue-500 text-green-800'
                        : post.post_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : post.post_status === 'draft'
                        ? 'bg-blue-500 text-gray-800'
                        : 'bg-blue-500 text-red-800'
                    }`}
                  >
                    {post.post_status.charAt(0).toUpperCase() + post.post_status.slice(1)}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-500 text-blue-800 flex-shrink-0">
                    🏘️ Group Post
                  </span>
                  {post.visibility && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0 ${
                        post.visibility === 'public'
                          ? 'bg-blue-500 text-blue-800'
                          : 'bg-blue-500 text-gray-800'
                      }`}
                    >
                      {post.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                    </span>
                  )}
                </div>

                {/* Title and Menu */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex-1 leading-tight">{post.post_title}</h1>
                  {canDeletePost && (
                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(!showMenu);
                        }}
                        className="p-2 hover:bg-blue-500 rounded-full transition-colors flex-shrink-0"
                        title="Post options"
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {showMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-grey-200 rounded-lg shadow-xl border border-gray-300 z-20 py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost();
                            }}
                            disabled={isDeleting}
                            className="w-full text-left px-4 py-2 hover:bg-grey-200 transition-colors flex items-center gap-2 text-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Post Metadata */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Posted:</span>{' '}
                      {new Date(post.post_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {post.post_modified && post.post_modified !== post.post_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="font-medium">Updated:</span>{' '}
                      {new Date(post.post_modified).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              </header>

              {/* Author Info */}
              {post.author && (
                <div className="flex items-center gap-4 mb-8 px-4 md:px-8">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-gray-900 text-lg font-bold flex-shrink-0">
                    {post.author.name?.charAt(0).toUpperCase() ||
                      post.author.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{post.author.name || post.author.username}</h3>
                      {currentUser?.id === post.author.id && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-500 text-blue-800 rounded">You</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">@{post.author.username}</p>
                  </div>
                </div>
              )}

              {/* Images Carousel */}
              {post.images && post.images.length > 0 && (
                <div className="mb-12 px-4 md:px-8">
                {/* Main Carousel */}
                <div
                  className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 cursor-grab active:cursor-grabbing"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="aspect-video bg-black flex items-center justify-center">
                    <img
                      src={post.images[selectedImageIndex]}
                      alt={`${post.post_title} - Image ${selectedImageIndex + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Image Counter */}
                  {post.images.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {selectedImageIndex + 1} / {post.images.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {post.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {post.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndex === index
                            ? 'border-blue-500 opacity-100'
                            : 'border-gray-300 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${post.post_title} - Thumbnail ${index + 1}`}
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
            )}

              {/* Excerpt */}
              {post.post_excerpt && (
                <div className="mb-8 px-4 md:px-8">
                  <div className="p-4 bg-grey-200 border-l-4 border-blue-500 rounded">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Summary</p>
                    <p className="text-lg text-gray-700 italic">{post.post_excerpt}</p>
                  </div>
                </div>
              )}

              {/* Content */}
              {post.post_content && (
                <div className="mb-8 px-4 md:px-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Content
                  </h3>
                  <div className="prose prose-lg max-w-none">
                    <div className="text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-6 rounded-lg border border-gray-300">
                      {post.post_content}
                    </div>
                  </div>
                </div>
              )}

              {/* Engagement Buttons */}
              <div className="mb-8 px-4 md:px-8 border-t border-gray-300 pt-4">
                <GroupEngagementButtons
                  postId={post.id}
                  postTitle={post.post_title}
                  showLabels={true}
                />
              </div>

              {/* Comments Section */}
              <div className="mb-8 px-4 md:px-8 border-t border-gray-300 flex flex-col max-h-[600px]">
                <GroupCommentsSection postId={post.id} currentUserId={currentUser?.id} className="mt-6" />
              </div>

              {/* Group Info */}
              {post.group && (
                <div className="px-4 md:px-8 mb-8">
                  <div className="p-6 bg-grey-200 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Posted in Group
                    </h3>
                    <Link
                      href={`/groups/${post.group_id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-lg transition-colors"
                    >
                      🏘️ {post.group.group_name}
                    </Link>
                    {post.group.description && (
                      <p className="text-gray-600 mt-3">{post.group.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* Lightbox Modal */}
          {showLightbox && post.images && post.images.length > 0 && (
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 flex-col"
              onClick={() => setShowLightbox(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Main Image */}
              <div className="relative flex-1 flex items-center justify-center max-w-5xl w-full mb-4 cursor-grab active:cursor-grabbing">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLightbox(false);
                }}
                className="absolute top-4 right-4 text-gray-900 hover:bg-grey-200/20 p-2 rounded-full transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Previous Button */}
              {post.images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev === 0 ? post.images!.length - 1 : prev - 1));
                  }}
                  className="absolute left-4 text-gray-900 hover:bg-grey-200/20 p-2 rounded-full transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Image */}
              <img
                src={post.images[selectedImageIndex]}
                alt={`Image ${selectedImageIndex + 1}`}
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Image Counter */}
              {post.images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/75 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {selectedImageIndex + 1} / {post.images.length}
                </div>
              )}

              {/* Next Button */}
              {post.images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev === post.images!.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-4 text-gray-900 hover:bg-grey-200/20 p-2 rounded-full transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Thumbnail Navigation */}
            {post.images.length > 1 && (
              <div className="flex gap-2 justify-center flex-wrap max-w-5xl">
                {post.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(index);
                    }}
                    className={`relative overflow-hidden rounded-lg h-16 w-16 flex-shrink-0 transition-all ${
                      index === selectedImageIndex
                        ? 'ring-2 ring-blue-400 opacity-100'
                        : 'opacity-60 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              )}
            </div>
          )}

          {/* Related Actions */}
          <div className="mt-12 flex gap-4 justify-center flex-wrap">
            <Link
              href={post.group ? `/groups/${post.group_id}/create-post` : '/'}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Post
            </Link>
            <Link
              href={post.group ? `/groups/${post.group_id}` : '/'}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to {post.group ? post.group.group_name : 'Group'}
            </Link>
          </div>
        </div>
      </div>
    </GroupEngagementProvider>
  );
}
