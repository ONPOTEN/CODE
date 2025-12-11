'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { groupPosts, GroupPost, ApiException, users, User } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GroupEngagementProvider } from '@/contexts/GroupEngagementContext';
import { GroupEngagementButtons } from '@/components/GroupEngagementButtons';
import VideoPlayer from '@/components/VideoPlayer';

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
  const [editingPost, setEditingPost] = useState<GroupPost | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', content: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [editVideo, setEditVideo] = useState<File | null>(null);
  const [editVideoPreview, setEditVideoPreview] = useState<string | null>(null);
  const [existingVideo, setExistingVideo] = useState<string | null>(null);
  const [removeExistingVideo, setRemoveExistingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
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

  const handleEditPost = (post: GroupPost) => {
    setOpenMenuId(null);
    setEditingPost(post);
    setEditFormData({
      title: post.post_title || '',
      content: post.post_content || '',
    });
    setExistingImages(post.images || []);
    setEditImages([]);
    setEditImagePreviews([]);
    setExistingVideo(post.video || null);
    setEditVideo(null);
    setEditVideoPreview(null);
    setRemoveExistingVideo(false);
    setVideoError(null);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 images total
    const totalImages = existingImages.length + editImages.length + files.length;
    if (totalImages > 10) {
      alert('Maximum 10 images allowed');
      return;
    }

    setEditImages((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
    setEditImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/') && !file.name.endsWith('.mp4')) {
      setVideoError('Chỉ hỗ trợ file video MP4');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setVideoError('Video không được vượt quá 100MB');
      return;
    }

    // Clear previous video preview
    if (editVideoPreview) {
      URL.revokeObjectURL(editVideoPreview);
    }

    setEditVideo(file);
    setEditVideoPreview(URL.createObjectURL(file));
    setVideoError(null);
    // If adding a new video, mark existing for removal
    if (existingVideo) {
      setRemoveExistingVideo(true);
    }
  };

  const removeNewVideo = () => {
    if (editVideoPreview) {
      URL.revokeObjectURL(editVideoPreview);
    }
    setEditVideo(null);
    setEditVideoPreview(null);
  };

  const handleRemoveExistingVideo = () => {
    setExistingVideo(null);
    setRemoveExistingVideo(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;

    try {
      setEditLoading(true);

      // Use FormData if there are new images, video changes, or if images were removed
      const hasImageChanges = editImages.length > 0 || existingImages.length !== (editingPost.images?.length || 0);
      const hasVideoChanges = editVideo !== null || removeExistingVideo;

      if (hasImageChanges || hasVideoChanges) {
        const formData = new FormData();
        formData.append('post_title', editFormData.title);
        formData.append('post_content', editFormData.content);

        // Add existing images URLs
        existingImages.forEach((url, index) => {
          formData.append(`existing_images[${index}]`, url);
        });

        // Add new images
        editImages.forEach((file) => {
          formData.append('images[]', file);
        });

        // Add video if provided
        if (editVideo) {
          formData.append('video', editVideo);
        }

        // Add remove_video flag if needed
        if (removeExistingVideo && !editVideo) {
          formData.append('remove_video', '1');
        }

        await groupPosts.updateWithFiles(editingPost.id, formData);
      } else {
        await groupPosts.update(editingPost.id, {
          post_title: editFormData.title,
          post_content: editFormData.content,
        });
      }

      // Update post in the list
      const updatedImages = [...existingImages, ...editImagePreviews];
      setPostsList((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? { ...p, post_title: editFormData.title, post_content: editFormData.content, images: updatedImages.length > 0 ? updatedImages : p.images }
            : p
        )
      );
      setEditingPost(null);
      setEditImages([]);
      setEditImagePreviews([]);
      setExistingImages([]);
      // Clean up video state
      if (editVideoPreview) {
        URL.revokeObjectURL(editVideoPreview);
      }
      setEditVideo(null);
      setEditVideoPreview(null);
      setExistingVideo(null);
      setRemoveExistingVideo(false);
      setVideoError(null);
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Failed to update post: ${err.message}`);
      } else {
        alert('Failed to update post');
      }
      console.error('Update error:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleScrollToComments = (postId: number) => {
    setOpenMenuId(null);
    router.push(`/group-posts/${postId}?scrollToComments=true`);
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
                                  onClick={() => handleEditPost(post)}
                                  className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-blue-600 hover:bg-blue-50"
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

                      {/* Video Player */}
                      {post.video && (
                        <div className="mt-3 w-full rounded-lg overflow-hidden">
                          <VideoPlayer
                            src={post.video}
                            poster={post.featured_image || (post.images && post.images.length > 0 ? post.images[0] : undefined)}
                            className="aspect-video w-full"
                          />
                        </div>
                      )}

                      {/* Engagement buttons */}
                      <div className="flex gap-6 mt-3 text-gray-600">
                        <GroupEngagementButtons
                          postId={post.id}
                          postTitle={post.post_title}
                          onCommentClick={() => handleScrollToComments(post.id)}
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

        {/* Edit Modal */}
        {editingPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold mb-4">Edit Post</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Post title (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={editFormData.content}
                    onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="What's on your mind?"
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>

                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Current images:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {existingImages.map((url, index) => (
                          <div key={`existing-${index}`} className="relative group">
                            <img
                              src={url}
                              alt={`Existing ${index + 1}`}
                              className="w-full h-16 md:h-20 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Image Previews */}
                  {editImagePreviews.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">New images:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {editImagePreviews.map((preview, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <img
                              src={preview}
                              alt={`New ${index + 1}`}
                              className="w-full h-16 md:h-20 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <input
                    type="file"
                    ref={editFileInputRef}
                    onChange={handleEditImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={existingImages.length + editImages.length >= 10}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Images ({existingImages.length + editImages.length}/10)
                  </button>
                </div>

                {/* Video Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Video (MP4, tối đa 100MB)</label>

                  {videoError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
                      {videoError}
                    </div>
                  )}

                  {/* Existing Video */}
                  {existingVideo && !removeExistingVideo && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Current video:</p>
                      <div className="relative">
                        <video
                          src={existingVideo}
                          className="w-full max-h-48 object-contain rounded-lg bg-black"
                          controls
                        />
                        <button
                          type="button"
                          onClick={handleRemoveExistingVideo}
                          className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-70 text-white rounded-full flex items-center justify-center text-sm hover:bg-opacity-90"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}

                  {/* New Video Preview */}
                  {editVideoPreview && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">New video:</p>
                      <div className="relative">
                        <video
                          src={editVideoPreview}
                          className="w-full max-h-48 object-contain rounded-lg bg-black"
                          controls
                        />
                        <button
                          type="button"
                          onClick={removeNewVideo}
                          className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-70 text-white rounded-full flex items-center justify-center text-sm hover:bg-opacity-90"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          {editVideo?.name} ({((editVideo?.size || 0) / 1024 / 1024).toFixed(1)} MB)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Video Upload Input - show only when no existing video and no new video preview */}
                  {!editVideoPreview && (!existingVideo || removeExistingVideo) && (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center py-4">
                        <span className="text-2xl mb-1">🎬</span>
                        <p className="text-sm text-gray-500">
                          <span className="font-semibold">Click to upload video</span>
                        </p>
                        <p className="text-xs text-gray-500">MP4 (max 100MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleEditVideoSelect}
                        accept="video/mp4,.mp4"
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="mt-4 md:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingPost(null);
                    setEditImages([]);
                    setEditImagePreviews([]);
                    setExistingImages([]);
                    // Clean up video state
                    if (editVideoPreview) {
                      URL.revokeObjectURL(editVideoPreview);
                    }
                    setEditVideo(null);
                    setEditVideoPreview(null);
                    setExistingVideo(null);
                    setRemoveExistingVideo(false);
                    setVideoError(null);
                  }}
                  disabled={editLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm md:text-base disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm md:text-base disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </GroupEngagementProvider>
  );
}
