'use client';

/**
 * Group Comments Section Component - Display and manage comments for group posts
 * Features: Real-time updates, nested replies, edit/delete functionality
 * Uses GroupEngagementContext for group post engagement
 */

import React, { useState, useEffect } from 'react';
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
      className={`flex gap-3 py-3 border-b border-gray-200 last:border-b-0 ${
        level > 0 ? 'ml-8 bg-gray-50 rounded p-3' : ''
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {comment.author?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
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
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
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
  const { user: authUser } = useAuth();
  const { comments, commentLoading, addComment, fetchComments } = useGroupEngagement();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments on mount
  useEffect(() => {
    if (postId) {
      fetchComments(postId);
    }
  }, [postId, fetchComments]);

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
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Comments ({postComments.length})</h2>

      {/* Comment Form */}
      {authUser ? (
        <form onSubmit={handleSubmitComment} className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                {authUser.display_name?.charAt(0).toUpperCase() || authUser.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>

            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? 'Write a reply...' : 'Share your thoughts...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                disabled={isSubmitting}
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="mt-3 flex gap-2">
                {replyingTo && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Cancel Reply
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 pb-8 border-b border-gray-200 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600 mb-3">
            Please <Link href="/login" className="text-blue-600 hover:underline font-medium">log in</Link> to comment
          </p>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : postComments.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No comments yet. Be the first to comment!</p>
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
  );
}
