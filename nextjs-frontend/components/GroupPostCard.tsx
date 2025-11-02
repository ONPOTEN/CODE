'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GroupPost, groupPosts } from '@/lib/api';

interface GroupPostCardProps {
  post: GroupPost;
  groupId?: number;
  groupOwnerId?: number;
  isUserModerator?: boolean;
  onPostApproved?: (postId: number) => void;
  onPostRejected?: (postId: number) => void;
}

export default function GroupPostCard({
  post,
  groupId,
  groupOwnerId,
  isUserModerator,
  onPostApproved,
  onPostRejected,
}: GroupPostCardProps) {
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [dislikes, setDislikes] = useState(post.dislikes_count || 0);
  const [comments, setComments] = useState(post.comments_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isModeratingApprove, setIsModeratingApprove] = useState(false);
  const [isModeratingReject, setIsModeratingReject] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const handleLike = async () => {
    if (isLiking) return;
    try {
      setIsLiking(true);
      await groupPosts.like(post.id);
      setLikes((l) => l + 1);
    } catch (err) {
      console.error('Error liking post:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (isDisliking) return;
    try {
      setIsDisliking(true);
      await groupPosts.dislike(post.id);
      setDislikes((d) => d + 1);
    } catch (err) {
      console.error('Error disliking post:', err);
    } finally {
      setIsDisliking(false);
    }
  };

  const handleApprovePost = async () => {
    if (isModeratingApprove || !groupId) return;
    try {
      setIsModeratingApprove(true);
      setModerationError(null);
      await groupPosts.approvePost(groupId, post.id);
      if (onPostApproved) {
        onPostApproved(post.id);
      }
    } catch (err: any) {
      console.error('Error approving post:', err);
      setModerationError(err.message || 'Failed to approve post');
    } finally {
      setIsModeratingApprove(false);
    }
  };

  const handleRejectPost = async () => {
    if (isModeratingReject || !groupId) return;
    if (!confirm('Are you sure you want to reject this post?')) return;
    try {
      setIsModeratingReject(true);
      setModerationError(null);
      await groupPosts.rejectPost(groupId, post.id);
      if (onPostRejected) {
        onPostRejected(post.id);
      }
    } catch (err: any) {
      console.error('Error rejecting post:', err);
      setModerationError(err.message || 'Failed to reject post');
    } finally {
      setIsModeratingReject(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Featured Image */}
      {post.featured_image && (
        <div className="relative h-64 bg-gray-200 overflow-hidden">
          <img
            src={post.featured_image}
            alt={post.post_title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Author Info */}
        {post.author && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
            {post.author.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.display_name}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div>
              <Link
                href={`/users/${post.author.id}`}
                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {post.author.display_name}
              </Link>
              <p className="text-xs text-gray-500">{formatDate(post.post_date)}</p>
            </div>
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
          <Link href={`/group-posts/${post.id}`}>{post.post_title}</Link>
        </h2>

        {/* Excerpt */}
        {post.post_excerpt && <p className="text-gray-600 text-sm mb-4">{post.post_excerpt}</p>}

        {/* Content Preview */}
        {post.post_content && (
          <div className="text-gray-700 mb-4 line-clamp-3">
            {post.post_content.replace(/<[^>]*>/g, '').substring(0, 300)}...
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex gap-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center gap-2 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h-2m2 0h2m-2 0v2m0-2v-2m0 4h-2m2 0h2m-8-4l2 2m-2-2l-2-2m4 4v2m0-2v-2m0 4h2m-2 0h-2"
              />
            </svg>
            <span>{likes} Likes</span>
          </button>

          <button
            onClick={handleDislike}
            disabled={isDisliking}
            className="flex items-center gap-2 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 10l-2 2m0 0l2 2m-2-2h4" />
            </svg>
            <span>{dislikes} Dislikes</span>
          </button>

          <Link
            href={`/group-posts/${post.id}`}
            className="flex items-center gap-2 hover:text-green-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2l-4 4z" />
            </svg>
            <span>{comments} Comments</span>
          </Link>
        </div>

        {/* Status Badge - if post is pending or rejected */}
        {(post.post_status === 'pending' || post.post_status === 'trash') && (
          <div className={`mt-4 px-3 py-2 rounded-lg text-sm font-medium ${post.post_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {post.post_status === 'pending' ? '⏳ Pending Approval' : '🚫 Rejected'}
          </div>
        )}

        {/* Moderation Error */}
        {moderationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {moderationError}
          </div>
        )}

        {/* Moderation Buttons - only for admin/moderator and pending posts */}
        {isUserModerator && post.post_status === 'pending' && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleApprovePost}
              disabled={isModeratingApprove || isModeratingReject}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isModeratingApprove ? 'Approving...' : '✓ Approve Post'}
            </button>
            <button
              onClick={handleRejectPost}
              disabled={isModeratingApprove || isModeratingReject}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isModeratingReject ? 'Rejecting...' : '✗ Reject Post'}
            </button>
          </div>
        )}

        {/* Read More Link */}
        <div className="mt-4">
          <Link
            href={`/group-posts/${post.id}`}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
          >
            Read More
          </Link>
        </div>
      </div>
    </article>
  );
}
