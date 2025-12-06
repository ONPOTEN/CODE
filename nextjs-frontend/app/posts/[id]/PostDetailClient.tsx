'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { posts, Post, ApiException } from '@/lib/api';
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

  const shouldScrollToComments = searchParams.get('scrollToComments') === 'true';

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

            {/* Additional Images Carousel */}
            {post.images && post.images.length > 0 && (
              <div className="">
                {/* Main Carousel */}
                <div
                  className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 cursor-grab active:cursor-grabbing"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="aspect-video bg-black flex items-center justify-center">
                    <img
                      src={typeof post.images[selectedImageIndex] === 'string' ? post.images[selectedImageIndex] : post.images[selectedImageIndex]?.url || ''}
                      alt={`${post.title} - Image ${selectedImageIndex + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>


                  {/* Image Counter */}
                  <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {selectedImageIndex + 1} / {post.images?.length || 0}
                  </div>
                </div>

                {/* Thumbnail Strip */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {post.images.map((image, index) => (
                    <button
                      key={(typeof image === 'object' && image.id) || index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? 'border-blue-500 opacity-100'
                          : 'border-gray-300 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={typeof image === 'string' ? image : image.url || ''}
                        alt={`${post.title} - Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </button>
                  ))}
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
                  className="aspect-video"
                />
              </div>
            )}

            {/* Debug info for images */}
            {(!post.images || !Array.isArray(post.images) || post.images.length === 0) && !post.video && (
              <div className="mb-8 p-4 bg-white border border-gray-300 rounded-lg mx-4 md:mx-8">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Debug:</span> No additional images array found.
                  {post.featured_image && ' (Featured image is displayed above)'}
                </p>
              </div>
            )}

            {/* Content */}
            <div className="">
              <div className="prose prose-lg max-w-none">
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed bg-white rounded-lg">
                  {post.content || 'Không có nội dung.'}
                </div>
              </div>
            </div>

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
              <CommentsSection postId={post.id} currentUserId={user?.id} className="mt-6" />
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
