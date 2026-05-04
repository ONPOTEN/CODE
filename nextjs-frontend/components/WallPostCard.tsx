'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Post, GroupPost, WallPost, wallPosts } from '@/lib/api';

interface WallPostCardProps {
  wallPost?: WallPost;
  post?: Post; // Legacy prop for backward compatibility
  isCurrentUserModerator?: boolean;
  onApproved?: (wallPostId: number) => void;
  onRejected?: (wallPostId: number) => void;
}

export function WallPostCard({ wallPost, post: legacyPost, isCurrentUserModerator = false, onApproved, onRejected }: WallPostCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Support both new WallPost structure and legacy Post structure
  const isLegacyPost = !wallPost && legacyPost;
  const actualWallPost = wallPost || ({
    id: (legacyPost as any)?.id,
    post_type: 'wppost',
    status: 'accepted',
    post: legacyPost,
  } as unknown as WallPost);

  // Determine post type and get appropriate data
  const isGroupPost = actualWallPost.post_type === 'grouppost';
  const post = actualWallPost.post as any;

  // Get featured image - prioritize featured_image, then first image from images array
  const featuredImageUrl = post?.featured_image ||
    (post?.images && post.images.length > 0 ? post.images[0] : null);

  // Get post title based on type
  const postTitle = isGroupPost ? post?.post_title : post?.title;

  // Get post excerpt based on type
  const postExcerpt = isGroupPost ? post?.post_excerpt : post?.excerpt;

  // Get post status based on type
  const postStatus = isGroupPost ? post?.post_status : post?.status;

  // Get post type label
  const postTypeLabel = isGroupPost ? 'Bài viết nhóm' : 'Bài viết tường';

  // Get post date based on type
  const postDate = isGroupPost ? post?.post_date : post?.created_at;

  // Get post ID for linking
  const postId = isLegacyPost
    ? (legacyPost as any)?.id
    : (isGroupPost ? actualWallPost.group_post_id : actualWallPost.post_id);
  const postLink = isLegacyPost
    ? `/posts/${postId}`
    : (isGroupPost ? `/group-posts/${postId}` : `/posts/${postId}`);

  // Format date
  const formattedDate = new Date(postDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleApprove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isApproving || isRejecting) return;

    try {
      setIsApproving(true);
      setError(null);
      await wallPosts.accept(actualWallPost.id);
      if (onApproved) {
        onApproved(actualWallPost.id);
      }
    } catch (err: any) {
      console.error('Error approving wall post:', err);
      setError(err.message || 'Không thể duyệt bài viết');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isApproving || isRejecting) return;

    if (!confirm('Bạn có chắc muốn từ chối bài viết này?')) return;

    try {
      setIsRejecting(true);
      setError(null);
      await wallPosts.reject(actualWallPost.id);
      if (onRejected) {
        onRejected(actualWallPost.id);
      }
    } catch (err: any) {
      console.error('Error rejecting wall post:', err);
      setError(err.message || 'Không thể từ chối bài viết');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <article className="bg-gray-50 rounded-lg shadow-sm hover:shadow-lg transition-shadow border border-gray-300 overflow-hidden hover:border-blue-300 h-full flex flex-col">
      <Link href={postLink} className="flex-1 flex flex-col">
        {/* Featured Image */}
        {featuredImageUrl && (
          <div className="relative h-48 bg-gray-200 overflow-hidden">
            <img
              src={typeof featuredImageUrl === 'string' ? featuredImageUrl : featuredImageUrl.url || ''}
              alt={postTitle}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400';
                  placeholder.innerHTML = `
                    <svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  `;
                  e.currentTarget.parentElement.appendChild(placeholder);
                }
              }}
            />
          </div>
        )}

        {/* Image Placeholder */}
        {!featuredImageUrl && (
          <div className="relative h-48 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Post Type Badge */}
          <div className="mb-2">
            <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {postTypeLabel}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2 line-clamp-2">
            {postTitle}
          </h3>

          {/* Excerpt */}
          {postExcerpt && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1">
              {postExcerpt}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formattedDate}
              </span>
            </div>

            {/* Status Badge */}
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                postStatus === 'publish'
                  ? 'bg-green-100 text-green-800'
                  : postStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {postStatus}
            </span>
          </div>

          {/* Image Count Badge */}
          {post?.images && post.images.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-blue-600 font-medium">
                📷 +{post.images.length - 1} thêm {post.images.length === 2 ? 'hình' : 'hình'}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Wall Post Status */}
      {actualWallPost.status === 'pending' && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <p className="text-xs text-yellow-800 font-medium">⏳ Chờ duyệt</p>
        </div>
      )}

      {actualWallPost.status === 'rejected' && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-800 font-medium mb-1">🚫 Đã bị từ chối</p>
          {actualWallPost.rejection_reason && (
            <p className="text-xs text-red-700">{actualWallPost.rejection_reason}</p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Moderation Buttons - only for pending posts and authorized users */}
      {isCurrentUserModerator && actualWallPost.status === 'pending' && (
        <div className="px-4 py-3 bg-white border-t border-gray-300 flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="flex-1 px-3 py-2 bg-green-600 text-gray-900 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isApproving ? 'Đang duyệt...' : '✓ Duyệt'}
          </button>
          <button
            onClick={handleReject}
            disabled={isApproving || isRejecting}
            className="flex-1 px-3 py-2 bg-red-600 text-gray-900 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isRejecting ? 'Đang từ chối...' : '✗ Từ chối'}
          </button>
        </div>
      )}
    </article>
  );
}

export default WallPostCard;
