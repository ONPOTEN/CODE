'use client';

/**
 * Group Comments Section Component - Display and manage comments for group posts
 * Features: Real-time updates, nested replies, edit/delete functionality
 * Uses GroupEngagementContext for group post engagement
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGroupEngagement } from '@/contexts/GroupEngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { GroupComment } from '@/lib/groupEngagementService';

interface GroupCommentsSectionProps {
  postId: number;
  currentUserId?: number;
  className?: string;
}

function GroupCommentItem({
  comment,
  postId,
  currentUserId,
  onReplyClick,
  level = 0,
}: {
  comment: GroupComment;
  postId: number;
  currentUserId?: number;
  onReplyClick: (parentId: number) => void;
  level?: number;
}) {
  const { updateComment, deleteComment } = useGroupEngagement();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.comment_content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = currentUserId === comment.user_id;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    try {
      setIsSaving(true);
      await updateComment(postId, comment.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert('Failed to update comment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      setIsDeleting(true);
      await deleteComment(postId, comment.id);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`flex gap-3 py-3 border-b border-gray-300 last:border-b-0 ${
        level > 0 ? 'ml-8 bg-white rounded p-3' : ''
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.author?.avatar ? (
          <img
            src={comment.author.avatar}
            alt={comment.author?.name || comment.author_name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-gray-900 text-sm font-bold">
            {comment.author?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </div>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        {/* Author Info */}
        <div className="flex items-center gap-2">
          {comment.author?.id ? (
            <Link
              href={`/users/${comment.author.id}`}
              className="font-semibold text-sm text-gray-900 hover:text-blue-600 hover:underline transition-colors"
            >
              {comment.author?.name || comment.author_name}
            </Link>
          ) : (
            <span className="font-semibold text-sm text-gray-900">
              {comment.author?.name || comment.author_name}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
          {comment.status !== 'approved' && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              {comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
            </span>
          )}
        </div>

        {/* Comment Text */}
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editContent.trim()}
                className="px-3 py-1 bg-blue-500 text-gray-900 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.comment_content);
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-700 break-words">{comment.comment_content}</p>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="mt-2 flex gap-4">
            <button
              onClick={() => onReplyClick(comment.id)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              Reply
            </button>
            {isAuthor && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function GroupCommentsSection({ postId, currentUserId, className = '' }: GroupCommentsSectionProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { comments, commentLoading, addComment, fetchComments } = useGroupEngagement();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const commentsListRef = useRef<HTMLDivElement>(null);

  // Fetch comments on mount
  useEffect(() => {
    if (postId) {
      fetchComments(postId);
    }
  }, [postId, fetchComments]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientY);
    handleSwipeComments();
  };

  const handleSwipeComments = () => {
    if (!commentsListRef.current) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped up - scroll down
        commentsListRef.current.scrollTop += 80;
      } else {
        // Swiped down - scroll up
        commentsListRef.current.scrollTop -= 80;
      }
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (!authUser) {
      setError('You must be logged in to comment');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await addComment(postId, newComment, replyingTo || undefined);
      setNewComment('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const postComments = comments.get(postId) || [];
  const isLoading = commentLoading.get(postId) || false;

  return (
    <div id={`group-comments-section-${postId}`} className={`flex flex-col h-full ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Comments ({postComments.length})
      </h3>

      {/* Comments List - Scrollable with bottom padding for fixed form */}
      <div
        ref={commentsListRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="max-h-[calc(5*80px)] overflow-y-auto space-y-2 pb-48"
      >
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-gray-600">Loading comments...</p>
          </div>
        ) : postComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {postComments.map((comment) => (
              <GroupCommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                currentUserId={currentUserId}
                onReplyClick={setReplyingTo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment Input - Fixed at Bottom of Viewport */}
      {authUser ? (
        <div className="fixed bottom-[50px] left-0 right-0 bg-white border-t border-gray-300 shadow-lg z-50 p-4 space-y-2">
          {replyingTo !== null && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
              <span className="text-sm text-blue-700">
                Replying to comment #{replyingTo}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-sm text-blue-500 hover:text-blue-700 underline"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                disabled={isSubmitting}
              />
              <button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
                className="px-4 py-3 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium text-sm flex items-center gap-2 flex-shrink-0 h-fit"
                title="Post comment"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16151496 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99047963 L3.03521743,10.4314727 C3.03521743,10.5885701 3.34915502,10.7456675 3.50612381,10.7456675 L16.6915026,11.5311544 C16.6915026,11.5311544 17.1624089,11.5311544 17.1624089,12.0024465 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z"/>
                </svg>
                {isSubmitting ? '...' : ''}
              </button>
            </div>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="fixed bottom-[50px] left-0 right-0 bg-blue-50 border-t border-blue-200 shadow-lg z-50 p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-blue-700 text-sm mb-3">Sign in to comment on this post</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-600 font-medium text-sm"
            >
              Login to Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
