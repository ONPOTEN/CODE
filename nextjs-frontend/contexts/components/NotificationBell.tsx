'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSocket, type RealtimeNotification } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotificationCount,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatNotificationMessage,
  getNotificationIcon,
  getNotificationUrl,
  formatNotificationTime,
  type Notification,
} from '@/lib/notifications';

export default function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const { onNewNotification, offNewNotification, isConnected } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lấy số lượng thông báo ban đầu
  const fetchNotificationCount = useCallback(async () => {
    if (!isAuthenticated) return;
    const count = await getNotificationCount();
    setUnreadCount(count);
  }, [isAuthenticated]);

  // Lấy thông báo
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    const response = await getNotifications(1, 20);
    setNotifications(response.data);
    setIsLoading(false);
  }, [isAuthenticated]);

  // Xử lý thông báo thời gian thực mới
  const handleNewNotification = useCallback((notification: RealtimeNotification) => {
    console.log('[NotificationBell] New notification received:', notification);

    // Chỉ xử lý nếu thông báo dành cho người dùng hiện tại
    if (notification.ownid !== user?.id) return;

    // Tăng số lượng chưa đọc
    setUnreadCount(prev => prev + 1);

    // Thêm vào danh sách thông báo
    const newNotification: Notification = {
      id: notification.id,
      userid: notification.userid,
      ownid: notification.ownid,
      type: notification.type,
      posttype: notification.posttype,
      postid: notification.postid,
      content: notification.content,
      status: notification.status,
      created_at: notification.created_at,
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      const senderName = 'Ai đó';
      new Notification(`${getNotificationIcon(notification.type)} ${formatNotificationMessage(newNotification, senderName)}`, {
        body: notification.content?.substring(0, 100) || 'Nhấn để xem',
        icon: '/favicon.ico',
        tag: notification.id.toString(),
      });
    }
  }, [user?.id]);

  // Xử lý khi nhấp vào thông báo
  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === 0) {
      await markNotificationAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, status: 1 } : n)
      );
    }
    setIsOpen(false);
  };

  // Xử lý đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, status: 1 })));
  };

  // Đóng menu khi nhấp bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lấy dữ liệu ban đầu khi tải và thay đổi xác thực
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotificationCount();
      fetchNotifications();
    } else {
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [isAuthenticated, fetchNotificationCount, fetchNotifications]);

  // Đăng ký nhận thông báo thời gian thực
  useEffect(() => {
    if (!isConnected || !user) return;

    onNewNotification(handleNewNotification);

    return () => {
      offNewNotification(handleNewNotification);
    };
  }, [isConnected, user, onNewNotification, offNewNotification, handleNewNotification]);

  // Yêu cầu quyền thông báo khi tải
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Làm mới thông báo khi mở menu
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút chuông thông báo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors"
        aria-label="Thông báo"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Hình chưa đọc */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menu thả xuống thông báo */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
          {/* Tiêu đề */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      notification.status === 0 ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <Link
                      href={getNotificationUrl(notification)}
                      onClick={() => handleNotificationClick(notification)}
                      className="flex gap-3 p-4"
                    >
                      {/* Biểu tượng thông báo */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        notification.status === 0 ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Nội dung thông báo */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          notification.status === 0 ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {formatNotificationMessage(notification)}
                        </p>
                        {notification.content && (
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {notification.content}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatNotificationTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Chỉ thị chưa đọc */}
                      {notification.status === 0 && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Chân trang */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
