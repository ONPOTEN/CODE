'use client';

/**
 * Comments Section Component - Display and manage comments with threading support
 * Features: Real-time updates, nested replies, edit/delete functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEngagement } from '@/contexts/EngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { Comment } from '@/lib/engagementService';
import { users, User } from '@/lib/api';

interface CommentsSectionProps {
  postId: number;
  currentUserId?: number;
  postOwnerId?: number; // Owner ID for debug logging when user comments on owner's post
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
            alt={comment.author?.name || comment.author_name || 'Người dùng'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-gray-900 text-sm font-bold">
            {(comment.author?.name || comment.author_name || 'N').charAt(0).toUpperCase()}
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
              {comment.author?.name || comment.author_name || 'Ẩn danh'}
            </Link>
          ) : (
            <span className="font-semibold text-sm text-gray-900">
              {comment.author?.name || comment.author_name || 'Ẩn danh'}
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
          <div className="mt-1 space-y-2">
            {comment.content && (
              <div className="text-sm text-gray-700 break-words leading-relaxed post-comment-text">
                {comment.content.split(/(\[STICKER\].*?\[\/STICKER\]|\[GIF\].*?\[\/GIF\]|@\w+)/g).map((part, index) => {
                  if (part.startsWith('[STICKER]')) {
                    const url = part.replace('[STICKER]', '').replace('[/STICKER]', '');
                    return (
                      <div key={index} className="inline-block my-1 max-w-[120px] rounded-lg overflow-hidden border border-slate-100 shadow-sm bg-white p-1">
                        <img src={url} alt="Nhãn dán" className="w-full h-auto" />
                      </div>
                    );
                  }
                  if (part.startsWith('[GIF]')) {
                    const url = part.replace('[GIF]', '').replace('[/GIF]', '');
                    return (
                      <div key={index} className="block my-2 max-w-[280px] rounded-xl overflow-hidden border border-slate-100 shadow-md">
                        <img src={url} alt="GIF" className="w-full h-auto object-cover" />
                      </div>
                    );
                  }
                  if (part.startsWith('@')) {
                    return (
                      <Link 
                        key={index} 
                        href={`/users/username/${part.slice(1)}`}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        {part}
                      </Link>
                    );
                  }
                  return <span key={index}>{part}</span>;
                })}
              </div>
            )}
            {/* Comment Image */}
            {(comment.image || (comment as any).image_url || (comment as any).attachment || (comment as any).media_url) && (
              <div className="relative mt-2 inline-block">
                <img
                  src={comment.image || (comment as any).image_url || (comment as any).attachment || (comment as any).media_url}
                  alt="Đính kèm bình luận"
                  className="max-h-32 max-w-full rounded-lg border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(comment.image || (comment as any).image_url || (comment as any).attachment || (comment as any).media_url, '_blank')}
                />
              </div>
            )}
          </div>
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
  postOwnerId,
  className = '',
}: CommentsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Check if we're on a post detail page (bottom nav is hidden there)
  const isPostDetailPage = pathname?.startsWith('/posts/') && pathname !== '/posts/create';
  const { comments, commentLoading, addComment, fetchComments } = useEngagement();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [page, setPage] = useState(1);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const commentsListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Mention system states
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [showMentionBox, setShowMentionBox] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [cursorPos, setCursorPos] = useState(0);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // New Picker States
  const [activePicker, setActivePicker] = useState<'emoji' | 'gif' | 'sticker' | null>(null);
  const [gifQuery, setGifQuery] = useState('');

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh tối đa là 5MB');
        return;
      }
      setSelectedImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const checkMentions = async (text: string, pos: number) => {
    const textBeforeCursor = text.substring(0, pos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1 && (lastAtPos === 0 || /\s/.test(textBeforeCursor[lastAtPos - 1]))) {
      const query = textBeforeCursor.substring(lastAtPos + 1).split(/\s/)[0];
      
      // If we have at least 1 character after @
      if (query.length >= 1) {
        try {
          setIsSearchingUsers(true);
          const response = await users.search(query);
          if (response.data && response.data.length > 0) {
            setMentionSuggestions(response.data.slice(0, 5));
            setShowMentionBox(true);
            setMentionIndex(0);
            return;
          }
        } catch (error) {
          console.error('Failed to search users for mention:', error);
        } finally {
          setIsSearchingUsers(false);
        }
      }
    }
    setShowMentionBox(false);
  };

  const togglePicker = (picker: 'emoji' | 'gif' | 'sticker') => {
    setActivePicker(activePicker === picker ? null : picker);
    setShowMentionBox(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setCommentText(prev => prev + emoji);
    // Focus back to textarea
    textAreaRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    // For now, we'll append the URL to the text, since comments allow links/images
    // But ideally we'd send it as an attachment. 
    // Let's mock it as a special content.
    setCommentText(prev => prev + ` [GIF]${gifUrl}[/GIF] `);
    setActivePicker(null);
  };

  const handleStickerSelect = (stickerUrl: string) => {
    setCommentText(prev => prev + ` [STICKER]${stickerUrl}[/STICKER] `);
    setActivePicker(null);
  };

  const handleMentionButtonClick = () => {
    setCommentText(prev => prev + '@');
    textAreaRef.current?.focus();
    // Position cursor after @
    setTimeout(() => {
      if (textAreaRef.current) {
        const newPos = textAreaRef.current.value.length;
        textAreaRef.current.setSelectionRange(newPos, newPos);
        setCursorPos(newPos);
        checkMentions(textAreaRef.current.value, newPos);
      }
    }, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const pos = e.target.selectionStart;
    setCommentText(newText);
    setCursorPos(pos);
    checkMentions(newText, pos);
  };

  const insertMention = (user: User) => {
    if (!textAreaRef.current) return;
    
    const text = commentText;
    const pos = cursorPos;
    const textBeforeCursor = text.substring(0, pos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    const textAfterCursor = text.substring(pos);
    const beforeAt = text.substring(0, lastAtPos);
    
    // Insert username (without spaces for better matching later)
    const username = user.username || (user.display_name && user.display_name.replace(/\s+/g, '')) || 'user';
    const newText = `${beforeAt}@${username} ${textAfterCursor}`;
    setCommentText(newText);
    setShowMentionBox(false);
    
    // Focus back and set cursor
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        const newPos = beforeAt.length + username.length + 2;
        textAreaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handlePostComment = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!commentText.trim() && !selectedImage) {
      alert('Vui lòng nhập bình luận hoặc đính kèm ảnh');
      return;
    }

    // Debug log: Check if user is commenting on owner's post
    if (postOwnerId && currentUserId) {
      const isOwner = postOwnerId === currentUserId;
      console.log('[Socket.IO Debug] User commenting on post', {
        timestamp: new Date().toISOString(),
        postId,
        postOwnerId,
        currentUserId,
        isOwner,
        isCommentingOnOwnerPost: !isOwner,
        replyingTo,
        hasImage: !!selectedImage,
      });
    }

    try {
      setIsPosting(true);
      await addComment(postId, commentText.trim(), replyingTo || undefined, selectedImage || undefined, postOwnerId);
      setCommentText('');
      setReplyingTo(null);
      handleRemoveImage();
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
        <div className={`fixed left-0 right-0 bg-white border-t border-gray-300 shadow-lg z-50 p-4 space-y-2 ${isPostDetailPage ? 'bottom-0' : 'bottom-[50px]'}`}>
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

          <div className="max-w-7xl mx-auto relative">
            {/* Mention Suggestion Box */}
            {showMentionBox && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[60] animate-in slide-in-from-bottom-2 duration-200">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nhắc đến ai đó</span>
                  {isSearchingUsers && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {mentionSuggestions.map((user, idx) => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user)}
                      className={`w-full px-3 py-2 flex items-center gap-3 transition-colors text-left hover:bg-blue-50 ${idx === mentionIndex ? 'bg-blue-50' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-sm font-bold text-blue-600">{(user.display_name || user.username || 'U')[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{user.display_name || user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">@{user.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <textarea
                ref={textAreaRef}
                value={commentText}
                onChange={handleTextChange}
                placeholder="Viết bình luận... (Sử dụng @ để nhắc tên)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '80px' }}
              />

              <button
                onClick={handlePostComment}
                disabled={isPosting || (!commentText.trim() && !selectedImage)}
                className="px-3 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium text-sm flex items-center gap-2 flex-shrink-0"
                title="Đăng bình luận"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16151496 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99047963 L3.03521743,10.4314727 C3.03521743,10.5885701 3.34915502,10.7456675 3.50612381,10.7456675 L16.6915026,11.5311544 C16.6915026,11.5311544 17.1624089,11.5311544 17.1624089,12.0024465 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z"/>
                </svg>
                {isPosting ? '...' : ''}
              </button>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative mt-2 inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 max-w-full rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="Xóa ảnh"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Facebook-like action icons */}
            <div className="flex items-center gap-1 mt-2 px-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Camera/Photo icon */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${selectedImage ? 'bg-green-100' : ''}`}
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
                onClick={() => togglePicker('emoji')}
                className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${activePicker === 'emoji' ? 'bg-yellow-100' : ''}`}
                title="Thêm biểu tượng cảm xúc"
              >
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* GIF icon */}
              <button
                type="button"
                onClick={() => togglePicker('gif')}
                className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${activePicker === 'gif' ? 'bg-purple-100' : ''}`}
                title="Thêm GIF"
              >
                <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5c0 .8-.7 1.5-1.5 1.5H7v2H5.5V9H8c.8 0 1.5.7 1.5 1.5v1zm5 2c0 .8-.7 1.5-1.5 1.5h-2.5V9H13c.8 0 1.5.7 1.5 1.5v3zm4-3H17v1h1.5v1.5H17v2h-1.5V9h3v1.5zM8 10.5h-.5v1H8v-1zm5 0h-.5v3h.5v-3z"/>
                </svg>
              </button>

              {/* Sticker icon */}
              <button
                type="button"
                onClick={() => togglePicker('sticker')}
                className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${activePicker === 'sticker' ? 'bg-pink-100' : ''}`}
                title="Thêm nhãn dán"
              >
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* @ Mention icon */}
              <button
                type="button"
                onClick={handleMentionButtonClick}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Nhắc đến ai đó"
              >
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </button>
            </div>

            {/* Pickers UI */}
            {activePicker && (
              <div className="mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                {activePicker === 'emoji' && (
                  <div className="p-3 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto bg-white">
                    {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '🔥', '✨', '🌟', '💢', '💯', '🙏', '🤝', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiSelect(emoji)}
                        className="p-1.5 text-xl hover:bg-slate-50 transition-colors rounded-lg flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {activePicker === 'gif' && (
                  <div className="p-3 space-y-3 bg-white w-full">
                    <div className="relative">
                      <input
                        autoFocus
                        type="search"
                        placeholder="Tìm kiếm GIF..."
                        value={gifQuery}
                        onChange={(e) => setGifQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border-none rounded-full text-xs focus:ring-2 focus:ring-blue-500"
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {[
                        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY2Yjl6dzJpMzl6OWo4aXp6emZ6emZ6emZ6emZ6emZ6emZ6emZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxPduP9mHl6/giphy.gif',
                        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY2Yjl6dzJpMzl6OWo4aXp6emZ6emZ6emZ6emZ6emZ6emZ6emZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0MYzLL796YFm8U7e/giphy.gif',
                        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY2Yjl6dzJpMzl6OWo4aXp6emZ6emZ6emZ6emZ6emZ6emZ6emZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVUn7iM8FMEU24/giphy.gif',
                        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY2Yjl6dzJpMzl6OWo4aXp6emZ6emZ6emZ6emZ6emZ6emZ6emZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l41lTfX8VvW2WbWWA/giphy.gif'
                      ].map((url, i) => (
                        <button key={i} onClick={() => handleGifSelect(url)} className="rounded-lg overflow-hidden h-24 hover:opacity-80 transition-opacity bg-slate-100">
                          <img src={url} className="w-full h-full object-cover" alt="GIF" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activePicker === 'sticker' && (
                  <div className="p-3 bg-white w-full">
                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {[
                        'https://em-content.zobj.net/source/microsoft-teams/337/sparkling-heart_1f496.png',
                        'https://em-content.zobj.net/source/microsoft-teams/337/party-popper_1f389.png',
                        'https://em-content.zobj.net/source/microsoft-teams/337/rocket_1f680.png',
                        'https://em-content.zobj.net/source/microsoft-teams/337/fire_1f525.png',
                        'https://em-content.zobj.net/source/microsoft-teams/337/star-struck_1f929.png',
                        'https://em-content.zobj.net/source/microsoft-teams/337/clapping-hands_1f44f.png'
                      ].map((url, i) => (
                        <button key={i} onClick={() => handleStickerSelect(url)} className="p-2 hover:bg-slate-50 transition-colors rounded-xl bg-slate-50">
                          <img src={url} className="w-full h-auto" alt="Sticker" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`fixed left-0 right-0 bg-blue-50 border-t border-blue-200 shadow-lg z-50 p-4 ${isPostDetailPage ? 'bottom-0' : 'bottom-[50px]'}`}>
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
