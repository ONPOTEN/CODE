'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Notification } from '@/contexts/NotificationContext';
import { tokenStorage, users } from '@/lib/api';

interface UsernameCache {
  [key: number]: string;
}

interface UserCache {
  [key: number]: {
    username: string;
    avatar?: string;
    avatar_url?: string;
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { notifications, markAsRead, markAllAsRead, refreshNotificationCount } = useNotification();
  const [loading, setLoading] = useState(true);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [usernameCache, setUsernameCache] = useState<UsernameCache>({});
  const [userCache, setUserCache] = useState<UserCache>({});
  const [fetchingUsernames, setFetchingUsernames] = useState(false);

  const getPostLink = (notification: Notification) => {
    const { posttype, postid, commentid } = notification;

    if (posttype === 'grouppost') {
      return commentid ? `/groups#post-${postid}-comment-${commentid}` : `/groups#post-${postid}`;
    }
    if (posttype === 'post') {
      return commentid ? `/posts/${postid}#comment-${commentid}` : `/posts/${postid}`;
    }
    if (posttype === 'shoppost') {
      return commentid ? `/shops#post-${postid}-comment-${commentid}` : `/shops#post-${postid}`;
    }

    return '#';
  };

  const handleNotificationClick = (notification: Notification) => {
    const { posttype, ownid, userid } = notification;

    if (posttype === 'message') {
      // Navigate to /messages?room={ownid}-{userid}
      const roomName = `${ownid}-${userid}`;
      router.push(`/messages?room=${roomName}`);
      return;
    }

    const link = getPostLink(notification);
    if (link && link !== '#') {
      router.push(link);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      const token = tokenStorage.get();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications?per_page=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setLocalNotifications(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, user]);

  // Fetch usernames for notifications
  useEffect(() => {
    if (localNotifications.length === 0) return;

    const fetchUsernames = async () => {
      // Get unique userids that are not already cached
      const uniqueUserIds = Array.from(
        new Set(localNotifications.map(n => n.userid))
      ).filter(id => userCache[id] === undefined);

      if (uniqueUserIds.length === 0) return;

      setFetchingUsernames(true);

      try {
        // Fetch all users in parallel using the users API
        const userPromises = uniqueUserIds.map(async (userid) => {
          try {
            console.log(`[Notifications] Fetching user ${userid}...`);
            let userData = await users.getById(userid);
            console.log(`[Notifications] User ${userid} raw data:`, userData);

            // Handle wrapped response (data object)
            if (userData && typeof userData === 'object' && 'data' in userData) {
              userData = (userData as any).data;
            }

            console.log(`[Notifications] User ${userid} processed data:`, userData);
            const username = userData?.display_name || userData?.username || userData?.name;
            const avatar = userData?.avatar || userData?.avatar_url;
            if (username) {
              return { userid, username, avatar };
            }
            console.warn(`[Notifications] User ${userid} has no username/display_name`);
            return null;
          } catch (err) {
            console.error(`[Notifications] Failed to fetch user ${userid}:`, err);
            return null;
          }
        });

        const results = await Promise.all(userPromises);

        // Update cache only with successfully fetched usernames and avatars
        const newUserCache: UserCache = {};
        const newNameCache: UsernameCache = {};
        results.forEach(result => {
          if (result) {
            newNameCache[result.userid] = result.username;
            newUserCache[result.userid] = {
              username: result.username,
              avatar: result.avatar,
            };
          }
        });

        setUserCache(prev => ({ ...prev, ...newUserCache }));
        setUsernameCache(prev => ({ ...prev, ...newNameCache }));
      } catch (error) {
        console.error('Failed to fetch usernames:', error);
      } finally {
        setFetchingUsernames(false);
      }
    };

    fetchUsernames();
  }, [localNotifications, userCache]);

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id);
    setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 1 } : n));
    refreshNotificationCount();
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Vừa xong';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} phút trước`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} giờ trước`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} ngày trước`;
    }

    // Format as dd/mm/yyyy
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getUserAvatar = (userid: number): string | undefined => {
    return userCache[userid]?.avatar;
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setLocalNotifications(prev => prev.map(n => ({ ...n, status: 1 })));
    refreshNotificationCount();
  };

  const getNotificationText = (notification: Notification) => {
    const { type, posttype } = notification;

    if (type === 'comment') {
      if (posttype === 'grouppost') return 'đã bình luận về bài viết nhóm của bạn';
      if (posttype === 'post') return 'đã bình luận về bài viết của bạn';
      if (posttype === 'shoppost') return 'đã bình luận về bài viết cửa hàng của bạn';
    }

    if (type === 'like') {
      if (posttype === 'grouppost') return 'đã thích bài viết nhóm của bạn';
      if (posttype === 'post') return 'đã thích bài viết của bạn';
      if (posttype === 'shoppost') return 'đã thích bài viết cửa hàng của bạn';
    }

    if (type === 'message') {
      return 'đã gửi tin nhắn cho bạn';
    }

    return 'thông báo';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Vui lòng đăng nhập để xem thông báo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Thông báo</h1>
          {localNotifications.some(n => n.status === 0) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {/* Notifications List */}
        {localNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-500 text-sm">Chưa có thông báo nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {localNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  notification.status === 0 ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                }`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                  {getUserAvatar(notification.userid) ? (
                    <img
                      src={getUserAvatar(notification.userid)}
                      alt={usernameCache[notification.userid] || 'User'}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {(usernameCache[notification.userid] ?? 'U').charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Type icon badge */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                    {notification.type === 'comment' && (
                      <svg className="w-2.5 h-2.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                      </svg>
                    )}
                    {notification.type === 'like' && (
                      <svg className="w-2.5 h-2.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    )}
                    {notification.type === 'message' && (
                      <svg className="w-2.5 h-2.5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Username + Message + Time */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-900 leading-tight">
                      <span className="font-semibold hover:underline cursor-pointer">
                        {usernameCache[notification.userid] ?? (fetchingUsernames ? 'Đang tải...' : 'Người dùng')}
                      </span>{' '}
                      <span className="text-gray-900">{getNotificationText(notification)}</span>
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </div>

                  {/* Content preview */}
                  {notification.content && (
                    <p className="text-sm text-gray-600 mt-0.5 truncate leading-snug">
                      {notification.content}
                    </p>
                  )}

                  {/* Action button for unread */}
                  {notification.status === 0 && (
                    <div className="mt-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Đã đọc
                      </button>
                    </div>
                  )}
                </div>

                {/* Unread indicator */}
                {notification.status === 0 && (
                  <div className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
