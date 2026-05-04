'use client';

/**
 * Shop Post Comments Component - Display and manage comments for shop posts
 */

import React, { useState, useEffect } from 'react';
import { useShopPostEngagement } from '@/contexts/ShopPostEngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ShopPostCommentsProps {
  postId: number;
  className?: string;
}

export function ShopPostComments({ postId, className = '' }: ShopPostCommentsProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const {
    comments,
    commentLoading,
    fetchComments,
    addComment,
    deleteComment,
  } = useShopPostEngagement();

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postComments = comments.get(postId) || [];
  const isLoading = commentLoading.has(postId);

  useEffect(() => {
    if (postId) {
      fetchComments(postId);
    }
  }, [postId, fetchComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      await addComment(postId, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!replyContent.trim()) return;

    try {
      setIsSubmitting(true);
      await addComment(postId, replyContent.trim(), parentId);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return;

    try {
      await deleteComment(postId, commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Organize comments into parent-child structure
  const parentComments = postComments.filter(c => !c.parent_id);
  const getReplies = (parentId: number) => postComments.filter(c => c.parent_id === parentId);

  return (
    <div id={`shop-post-comments-section-${postId}`} className={`${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Bình luận ({postComments.length})
      </h3>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isAuthenticated ? "Viết bình luận..." : "Đăng nhập để bình luận"}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={!isAuthenticated || isSubmitting}
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!isAuthenticated || !newComment.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang đăng...' : 'Đăng bình luận'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : postComments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
        </div>
      ) : (
        <div className="space-y-4">
          {parentComments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              {/* Comment Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {comment.author?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {comment.author?.name || 'Ẩn danh'}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(comment.created_at)}</p>
                  </div>
                </div>
                {user && comment.user_id === user.id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {/* Comment Content */}
              <p className="text-gray-700 ml-13 mb-3">{comment.content}</p>

              {/* Reply Button */}
              {isAuthenticated && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium ml-13"
                >
                  Trả lời
                </button>
              )}

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="mt-3 ml-13">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Viết câu trả lời..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    rows={2}
                    disabled={isSubmitting}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyContent.trim() || isSubmitting}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Đang đăng...' : 'Trả lời'}
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm font-medium transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {getReplies(comment.id).length > 0 && (
                <div className="mt-4 ml-8 space-y-3 border-l-2 border-gray-200 pl-4">
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="bg-white rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-sm">
                            {reply.author?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {reply.author?.name || 'Ẩn danh'}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(reply.created_at)}</p>
                          </div>
                        </div>
                        {user && reply.user_id === user.id && (
                          <button
                            onClick={() => handleDeleteComment(reply.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm ml-10">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ShopPostComments;
