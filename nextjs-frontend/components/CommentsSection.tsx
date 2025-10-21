'use client';

/**
 * Comments Section Component - Display and manage comments with threading support
 * Features: Real-time updates, nested replies, edit/delete functionality
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEngagement } from '@/contexts/EngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { Comment } from '@/lib/engagementService';

interface CommentsSectionProps {
  postId: number;
  currentUserId?: number;
  className?: string;
}

function CommentItem({
  comment,
  postId,
  currentUserId,
  onReplyClick,
  level = 0,
}: {
  comment: Comment;
  postId: number;
  currentUserId?: number;
  onReplyClick: (parentId: number) => void;
  level?: number;
}) {
  const { updateComment, deleteComment } = useEngagement();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = currentUserId === comment.user_id;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    try {
      setIsSaving(true);
      await updateComment(comment.id, editContent.trim());
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
          <span className="font-semibold text-sm text-gray-900">
            {comment.author?.name || comment.author_name}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
          {!comment.approved && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              Pending
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
                  setEditContent(comment.content);
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-700 break-words">{comment.content}</p>
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
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium"
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

export function CommentsSection({
  postId,
  currentUserId,
  className = '',
}: CommentsSectionProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { comments, commentLoading, addComment, fetchComments } = useEngagement();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [page, setPage] = useState(1);

  const postComments = comments.get(postId) || [];
  const isLoadingComments = commentLoading.has(postId);

  // Load comments on mount
  useEffect(() => {
    if (postComments.length === 0) {
      fetchComments(postId, page);
    }
  }, [postId]);

  const handlePostComment = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!commentText.trim()) {
      alert('Please enter a comment');
      return;
    }

    try {
      setIsPosting(true);
      await addComment(postId, commentText.trim(), replyingTo || undefined);
      setCommentText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert(error instanceof Error ? error.message : 'Failed to post comment');
    } finally {
      setIsPosting(false);
    }
  };

  // Separate top-level and nested comments
  const topLevelComments = postComments.filter((c) => c.parent_id === 0);
  const nestedComments = (parentId: number) => postComments.filter((c) => c.parent_id === parentId);

  return (
    <div id={`comments-section-${postId}`} className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">
        Comments ({postComments.length})
      </h3>

      {/* Comment Input */}
      {isAuthenticated ? (
        <div className="space-y-2">
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

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />

          <button
            onClick={handlePostComment}
            disabled={isPosting || !commentText.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium text-sm"
          >
            {isPosting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      ) : (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm mb-3">Sign in to comment on this post</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm"
          >
            Login to Comment
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-2">
        {isLoadingComments && postComments.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-gray-600">Loading comments...</p>
          </div>
        ) : postComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          topLevelComments.map((comment) => (
            <div key={comment.id}>
              {/* Top-level comment */}
              <CommentItem
                comment={comment}
                postId={postId}
                currentUserId={currentUserId}
                onReplyClick={setReplyingTo}
                level={0}
              />

              {/* Nested replies */}
              {nestedComments(comment.id).length > 0 && (
                <div className="space-y-0">
                  {nestedComments(comment.id).map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      currentUserId={currentUserId}
                      onReplyClick={setReplyingTo}
                      level={1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {postComments.length > 0 && postComments.length % 15 === 0 && (
        <button
          onClick={() => {
            setPage(page + 1);
            fetchComments(postId, page + 1);
          }}
          disabled={isLoadingComments}
          className="w-full py-2 text-blue-500 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
        >
          {isLoadingComments ? 'Loading...' : 'Load More Comments'}
        </button>
      )}
    </div>
  );
}

export default CommentsSection;
