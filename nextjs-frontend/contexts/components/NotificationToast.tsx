'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeNotification } from '@/contexts/SocketContext';
import { formatNotificationMessage, getNotificationIcon, getNotificationUrl } from '@/lib/notifications';
import { users } from '@/lib/api';

interface ToastNotification extends RealtimeNotification {
  id: number;
  timestamp: number;
  username?: string;
  source?: 'notification' | 'comment';
}

interface UsernameCache {
  [key: number]: string;
}

interface CommentToast {
  id: number;
  postId: number;
  commentId: number;
  commentAuthorId: number;
  commentAuthorName?: string;
  commentAuthorAvatar?: string;
  commentContent: string;
  timestamp: number;
  debugMessage?: string;
}

export default function NotificationToast() {
  const router = useRouter();
  const { user } = useAuth();
  const { onNewNotification, offNewNotification, onPostCommentAdded, offPostCommentAdded } = useSocket();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [commentToasts, setCommentToasts] = useState<CommentToast[]>([]);
  const [usernameCache, setUsernameCache] = useState<UsernameCache>({});

  // Fetch username for a user ID
  const fetchUsername = useCallback(async (userId: number): Promise<string> => {
    // Return cached username if available
    if (usernameCache[userId]) {
      return usernameCache[userId];
    }

    try {
      const userData = await users.getById(userId);
      // Handle wrapped response
      const userDataUnwrapped = userData && typeof userData === 'object' && 'data' in userData
        ? (userData as any).data
        : userData;

      const username = userDataUnwrapped?.display_name || userDataUnwrapped?.username || 'Người dùng';

      // Update cache
      setUsernameCache(prev => ({
        ...prev,
        [userId]: username
      }));

      return username;
    } catch {
      return 'Người dùng';
    }
  }, [usernameCache]);

  // Add a new toast
  const addToast = useCallback((notification: RealtimeNotification) => {
    // Chỉ hiển thị nếu thông báo dành cho người dùng hiện tại
    if (notification.ownid !== user?.id) return;

    const toastId = notification.id;
    const timestamp = Date.now();

    // Create toast with initial data
    const toast: ToastNotification = {
      ...notification,
      timestamp,
      source: 'notification',
    };

    setToasts(prev => [toast, ...prev].slice(0, 5)); // Giữ tối đa 5 thông báo

    // Fetch username asynchronously and update toast
    fetchUsername(notification.userid).then(username => {
      setToasts(prev => prev.map(t =>
        t.id === toastId ? { ...t, username } : t
      ));
    });

    // Tự động xóa sau 5 giây
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 5000);
  }, [user, fetchUsername]);

  // Add a comment toast when someone comments on owned post (received via post:comment-added event)
  const addCommentToast = useCallback((data: any) => {
    console.log('[NotificationToast] post:comment-added event received:', data);
    console.log('[NotificationToast] Current user ID:', user?.id);

    const { post_id, comment } = data;
    if (!post_id || !comment) {
      console.log('[NotificationToast] Missing post_id or comment, returning early');
      return;
    }

    const commentAuthorId = comment.author?.id || comment.user_id;
    const commentAuthorName = comment.author?.name || comment.author_name;
    const commentAuthorAvatar = comment.author?.avatar;
    const timestamp = new Date().toISOString();

    console.log('[NotificationToast] Comment details:', {
      post_id,
      commentAuthorId,
      comment_user_id: comment.user_id,
      current_user_id: user?.id,
      isDifferent: comment.user_id !== user?.id,
    });

    // Check if => current user is => post owner
    if (comment.user_id !== user?.id) {
      const debugInfo = `[Socket.IO Debug] USER COMMENTING ON OWNER POST {timestamp: '${timestamp}', postId: ${post_id}, postOwnerId: ${user?.id}, commenterId: ${commentAuthorId}, commenterName: '${commentAuthorName}', …}`;
      console.log('[NotificationToast] Creating toast with debug info:', debugInfo);

      const toastId = Date.now();
      const commentToast: CommentToast = {
        id: toastId,
        postId: post_id,
        commentId: comment.id,
        commentAuthorId,
        commentAuthorName,
        commentAuthorAvatar,
        commentContent: comment.content || '',
        timestamp: toastId,
        debugMessage: debugInfo,
      };

      setCommentToasts(prev => [commentToast, ...prev].slice(0, 3));

      // Auto remove after 6 seconds
      setTimeout(() => {
        setCommentToasts(prev => prev.filter(t => t.id !== toastId));
      }, 6000);
    }
  }, [user?.id]);

  // Xóa một thông báo
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Xóa một comment toast
  const removeCommentToast = useCallback((id: number) => {
    setCommentToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Xử lý khi nhấp vào thông báo
  const handleToastClick = useCallback((notification: RealtimeNotification) => {
    router.push(getNotificationUrl(notification as any));
    removeToast(notification.id);
  }, [router, removeToast]);

  // Xử lý khi nhấp vào comment toast
  const handleCommentToastClick = useCallback((commentToast: CommentToast) => {
    router.push(`/posts/${commentToast.postId}`);
    removeCommentToast(commentToast.id);
  }, [router, removeCommentToast]);

  // Listen to post:comment-added events from main socket (backend emits to post owner)
  useEffect(() => {
    if (!user) return;

    console.log('[NotificationToast] User ID:', user?.id);
    console.log('[NotificationToast] onPostCommentAdded function exists:', typeof onPostCommentAdded === 'function');

    // Listen for post:comment-added events from main socket
    const listener = (data: any) => {
      console.log('[NotificationToast] post:comment-added listener called with data:', data);
      addCommentToast(data);
    };

    if (typeof onPostCommentAdded === 'function') {
      console.log('[NotificationToast] Attaching post:comment-added listener');
      onPostCommentAdded(listener);
    } else {
      console.error('[NotificationToast] onPostCommentAdded is not a function!');
    }

    return () => {
      if (typeof offPostCommentAdded === 'function') {
        console.log('[NotificationToast] Detaching post:comment-added listener');
        offPostCommentAdded(listener);
      }
    };
  }, [user, addCommentToast, onPostCommentAdded, offPostCommentAdded]);

  // Đăng ký nhận thông báo from main socket
  useEffect(() => {
    if (!user) return;

    onNewNotification(addToast);

    return () => {
      offNewNotification(addToast);
    };
  }, [user, onNewNotification, offNewNotification, addToast]);

  const allToasts = toasts;
  const allCommentToasts = commentToasts;

  if (allToasts.length === 0 && allCommentToasts.length === 0) return null;

  return (
    <>
      {/* Comment Toasts - Separate from regular notifications, appears on right */}
      {allCommentToasts.length > 0 && (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {allCommentToasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => handleCommentToastClick(toast)}
              className="pointer-events-auto bg-white rounded-lg shadow-lg border border-green-200 p-4 animate-slide-in-left cursor-pointer hover:shadow-xl transition-shadow relative overflow-hidden"
            >
              <div className="flex gap-3">
                {/* Avatar */}
                {toast.commentAuthorAvatar ? (
                  <img
                    src={toast.commentAuthorAvatar}
                    alt={toast.commentAuthorName || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">
                    💬
                  </div>
                )}

                {/* Nội dung */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.commentAuthorName || 'Người dùng'} đã bình luận về bài viết của bạn
                  </p>
                  {toast.commentContent && (
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {toast.commentContent}
                    </p>
                  )}
                  {/* Debug message in toast */}
                  {toast.debugMessage && (
                    <p className="text-xs text-red-500 mt-1 font-mono">
                      {toast.debugMessage}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(toast.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Nút đóng */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCommentToast(toast.id);
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Thanh tiến trình */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-green-500 animate-progress-bar"
                  style={{ animationDuration: '6000ms' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Regular Notification Toasts - Appears on left */}
      {allToasts.length > 0 && (
        <div className="fixed top-20 left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {allToasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => handleToastClick(toast)}
              className="pointer-events-auto bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-slide-in-left cursor-pointer hover:shadow-xl transition-shadow relative overflow-hidden"
            >
              <div className="flex gap-3">
                {/* Biểu tượng */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                  {getNotificationIcon(toast.type)}
                </div>

                {/* Nội dung */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {formatNotificationMessage(toast as any, toast.username)}
                  </p>
                  {toast.content && (
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {toast.content}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(toast.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Nút đóng */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(toast.id);
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Thanh tiến trình */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600 animate-progress-bar"
                  style={{ animationDuration: '5000ms' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
