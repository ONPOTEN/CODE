'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { tokenStorage } from '@/lib/api';

export interface Notification {
  id: number;
  userid: number;
  username?: string;
  ownid: number;
  type: string;
  posttype: string;
  postid: number;
  commentid?: number;
  room_name?: string;
  content: string;
  status: number;
  created_at: string;
}

interface NotificationContextType {
  notificationCount: number;
  notifications: Notification[];
  incrementNotification: () => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  refreshNotificationCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [displayCount, setDisplayCount] = useState(0);
  const { socket } = useSocket();
  const { user, isAuthenticated } = useAuth();

  // Lấy số lượng thông báo từ API
  const refreshNotificationCount = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    const token = tokenStorage.get();
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotificationCount(data.count);
      }
    } catch (error) {
      console.error('Không thể lấy số lượng thông báo:', error);
    }
  }, [isAuthenticated, user]);

  // Lấy thông báo từ API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    const token = tokenStorage.get();
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications?per_page=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Không thể lấy thông báo:', error);
    }
  }, [isAuthenticated, user]);

  // Đánh dấu thông báo đã đọc
  const markAsRead = useCallback(async (id: number) => {
    const token = tokenStorage.get();
    if (!token) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Cập nhật trạng thái cục bộ
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 1 } : n));
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Không thể đánh dấu thông báo đã đọc:', error);
    }
  }, [refreshNotificationCount]);

  // Đánh dấu tất cả thông báo đã đọc
  const markAllAsRead = useCallback(async () => {
    const token = tokenStorage.get();
    if (!token) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Cập nhật trạng thái cục bộ
      setNotifications(prev => prev.map(n => ({ ...n, status: 1 })));
      setNotificationCount(0);
    } catch (error) {
      console.error('Không thể đánh dấu tất cả thông báo đã đọc:', error);
    }
  }, []);

  // Tăng số lượng thông báo (được gọi khi nhận thông báo mới)
  const incrementNotification = useCallback(() => {
    setNotificationCount(prev => prev + 1);
  }, []);

  // Lắng nghe thông báo mới qua Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: Notification) => {
      console.log('[NotificationContext] New notification received:', data);

      // Chỉ xử lý nếu ownid của thông báo khớp với người dùng hiện tại
      if (user && data.ownid === user.id) {
        // Special handling for comment notifications
        if (data.type === 'comment') {
          console.log('[NotificationContext] Comment notification received:', {
            postId: data.postid,
            postType: data.posttype,
            senderId: data.userid,
            ownerId: data.ownid,
            content: data.content,
          });

          // Show browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${data.username || 'Ai đó'} đã bình luận về bài viết của bạn`, {
              body: data.content || 'Hãy xem bình luận mới',
              icon: '/icon-192.png',
              tag: `comment-${data.postid}`,
            });
          }
        }

        // Thêm vào danh sách thông báo
        setNotifications(prev => [data, ...prev]);

        // Tăng số lượng ngay lập tức
        setNotificationCount(prev => prev + 1);

        // Sau 6 giây, giảm số lượng hiển thị (xóa hình)
        setTimeout(() => {
          setDisplayCount(prev => Math.max(0, prev - 1));
        }, 6000);
      }
    };

    socket.on('new:notification', handleNewNotification);

    return () => {
      socket.off('new:notification', handleNewNotification);
    };
  }, [socket, user]);

  // Đồng bộ số lượng hiển thị với số lượng thông báo
  useEffect(() => {
    setDisplayCount(notificationCount);
  }, [notificationCount]);

  // Lấy thông báo ban đầu
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshNotificationCount();
      fetchNotifications();

      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('[NotificationContext] Browser notification permission:', permission);
        });
      }
    }
  }, [isAuthenticated, user, refreshNotificationCount, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notificationCount: displayCount,
        notifications,
        incrementNotification,
        markAsRead,
        markAllAsRead,
        refreshNotificationCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification phải được sử dụng trong NotificationProvider');
  }
  return context;
}
