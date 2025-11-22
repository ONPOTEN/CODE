'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GroupPost, groupPosts } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [dislikes, setDislikes] = useState(post.dislikes_count || 0);
  const [comments, setComments] = useState(post.comments_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isModeratingApprove, setIsModeratingApprove] = useState(false);
  const [isModeratingReject, setIsModeratingReject] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleEditPost = () => {
    setShowMenu(false);
    router.push(`/group-posts/${post.id}/edit`);
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      setIsDeleting(true);
      await groupPosts.delete(post.id);
      setShowMenu(false);
      // Refresh the page or trigger a callback
      window.location.reload();
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post');
      setIsDeleting(false);
    }
  };

  // Check if current user can edit/delete this post
  // Post author or group admin can edit/delete
  const canManagePost = currentUser && (
    currentUser.id === post.post_author ||
    currentUser.id === groupOwnerId
  );

  return (
    <article className="bg-gray-50 rounded-lg shadow-md border border-gray-300 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
      {/* Featured Image with Overlay */}
      <div className="relative h-48 bg-gray-300 overflow-hidden flex-shrink-0">
        {post.featured_image ? (
          <>
            <img
              src={post.featured_image}
              alt={post.post_title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-500">
            <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Status Badge and Menu - Top Right */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {post.post_status && (
            <div>
              {post.post_status === 'pending' && (
                <span className="inline-block px-2 py-1 bg-yellow-500 text-gray-900 text-xs font-bold rounded-full">⏳ Pending</span>
              )}
              {post.post_status === 'trash' && (
                <span className="inline-block px-2 py-1 bg-red-500 text-gray-900 text-xs font-bold rounded-full">🚫 Rejected</span>
              )}
              {post.post_status === 'publish' && (
                <span className="inline-block px-2 py-1 bg-green-500 text-gray-900 text-xs font-bold rounded-full">✓ Published</span>
              )}
            </div>
          )}

          {/* Three Dot Menu - Only show if user can manage post */}
          {canManagePost && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 hover:bg-gray-50/20 rounded-full transition-colors"
                title="Post options"
              >
                <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-50 rounded-lg shadow-xl border border-gray-300 z-20 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditPost();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-white transition-colors flex items-center gap-2 text-gray-700 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Post
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePost();
                    }}
                    disabled={isDeleting}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isDeleting ? 'Deleting...' : 'Delete Post'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Author Info */}
        {post.author && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-300">
            {post.author.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.name}
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
                {post.author.name}
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
        <div className="flex gap-6 pt-4 border-t border-gray-300 text-sm text-gray-600">
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

        {/* Image Count Badge */}
        {post.images && post.images.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-blue-600 font-medium">
              📷 +{post.images.length - 1} more {post.images.length === 2 ? 'image' : 'images'}
            </span>
          </div>
        )}

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
              className="flex-1 px-4 py-2 bg-green-600 text-gray-900 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isModeratingApprove ? 'Approving...' : '✓ Approve Post'}
            </button>
            <button
              onClick={handleRejectPost}
              disabled={isModeratingApprove || isModeratingReject}
              className="flex-1 px-4 py-2 bg-red-600 text-gray-900 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isModeratingReject ? 'Rejecting...' : '✗ Reject Post'}
            </button>
          </div>
        )}

        {/* Read More Link */}
        <div className="mt-4">
          <Link
            href={`/group-posts/${post.id}`}
            className="inline-block px-4 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
          >
            Read More
          </Link>
        </div>
      </div>
    </article>
  );
}
