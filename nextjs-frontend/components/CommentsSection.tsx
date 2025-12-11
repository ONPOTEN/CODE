'use client';

/**
 * Comments Section Component - Display and manage comments with threading support
 * Features: Real-time updates, nested replies, edit/delete functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
      alert('Không thể cập nhật bình luận');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;

    try {
      setIsDeleting(true);
      await deleteComment(postId, comment.id);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Không thể xóa bình luận');
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
        {(comment.author?.avatar || (comment.author as any)?.avatar_url) ? (
          <img
            src={comment.author?.avatar || (comment.author as any)?.avatar_url}
            alt={comment.author?.name || comment.author_name || 'User'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-gray-900 text-sm font-bold">
            {(comment.author?.name || comment.author_name || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        {/* Author Info */}
        <div className="flex items-center gap-2">
          {comment.author?.id || comment.user_id ? (
            <Link
              href={`/users/${comment.author?.id || comment.user_id}`}
              className="font-semibold text-sm text-gray-900 hover:text-blue-600 hover:underline transition-colors"
            >
              {comment.author?.name || comment.author_name || 'Anonymous'}
            </Link>
          ) : (
            <span className="font-semibold text-sm text-gray-900">
              {comment.author?.name || comment.author_name || 'Anonymous'}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
          {!comment.approved && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              Chờ duyệt
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
                {isSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                Hủy
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
              Trả lời
            </button>
            {isAuthor && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                >
                  Sửa
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  {isDeleting ? 'Đang xóa...' : 'Xóa'}
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
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const commentsListRef = useRef<HTMLDivElement>(null);

  const postComments = comments.get(postId) || [];
  const isLoadingComments = commentLoading.has(postId);

  // Load comments on mount
  useEffect(() => {
    if (postComments.length === 0) {
      fetchComments(postId, page);
    }
  }, [postId]);

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

  const handlePostComment = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!commentText.trim()) {
      alert('Vui lòng nhập bình luận');
      return;
    }

    try {
      setIsPosting(true);
      await addComment(postId, commentText.trim(), replyingTo || undefined);
      setCommentText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert(error instanceof Error ? error.message : 'Không thể đăng bình luận');
    } finally {
      setIsPosting(false);
    }
  };

  // Separate top-level and nested comments
  const topLevelComments = postComments.filter((c) => c.parent_id === 0);
  const nestedComments = (parentId: number) => postComments.filter((c) => c.parent_id === parentId);

  return (
    <div id={`comments-section-${postId}`} className={`flex flex-col h-full ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Bình luận ({postComments.length})
      </h3>

      {/* Comments List - Scrollable with bottom padding for fixed form */}
      <div
        ref={commentsListRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="max-h-[calc(5*80px)] overflow-y-auto space-y-2 pb-48"
      >
        {isLoadingComments && postComments.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-gray-600">Đang tải bình luận...</p>
          </div>
        ) : postComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
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

      {/* Comment Input - Fixed at Bottom of Viewport */}
      {isAuthenticated ? (
        <div className="fixed bottom-[50px] left-0 right-0 bg-white border-t border-gray-300 shadow-lg z-50 p-4 space-y-2">
          {replyingTo !== null && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
              <span className="text-sm text-blue-700">
                Đang trả lời bình luận #{replyingTo}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-sm text-blue-500 hover:text-blue-700 underline"
              >
                Hủy
              </button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            <div className="flex gap-2 items-center">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '80px' }}
              />

              <button
                onClick={handlePostComment}
                disabled={isPosting || !commentText.trim()}
                className="px-3 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium text-sm flex items-center gap-2 flex-shrink-0"
                title="Đăng bình luận"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16151496 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99047963 L3.03521743,10.4314727 C3.03521743,10.5885701 3.34915502,10.7456675 3.50612381,10.7456675 L16.6915026,11.5311544 C16.6915026,11.5311544 17.1624089,11.5311544 17.1624089,12.0024465 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z"/>
                </svg>
                {isPosting ? '...' : ''}
              </button>
            </div>

            {/* Facebook-like action icons */}
            <div className="flex items-center gap-1 mt-2 px-2">
              {/* Camera/Photo icon */}
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Thêm ảnh"
              >
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Emoji icon */}
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Thêm biểu tượng cảm xúc"
              >
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* GIF icon */}
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Thêm GIF"
              >
                <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5c0 .8-.7 1.5-1.5 1.5H7v2H5.5V9H8c.8 0 1.5.7 1.5 1.5v1zm5 2c0 .8-.7 1.5-1.5 1.5h-2.5V9H13c.8 0 1.5.7 1.5 1.5v3zm4-3H17v1h1.5v1.5H17v2h-1.5V9h3v1.5zM8 10.5h-.5v1H8v-1zm5 0h-.5v3h.5v-3z"/>
                </svg>
              </button>

              {/* Sticker icon */}
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Thêm nhãn dán"
              >
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* @ Mention icon */}
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Nhắc đến ai đó"
              >
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-[50px] left-0 right-0 bg-blue-50 border-t border-blue-200 shadow-lg z-50 p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-blue-700 text-sm mb-3">Đăng nhập để bình luận bài viết này</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-600 font-medium text-sm"
            >
              Đăng nhập để bình luận
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommentsSection;
