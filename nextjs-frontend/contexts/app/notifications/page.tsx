'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import type { RealtimeNotification } from '@/contexts/SocketContext';
import {
  getNotifications,
  getNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatNotificationMessage,
  getNotificationIcon,
  getNotificationUrl,
  formatNotificationTime,
  type Notification,
} from '@/lib/notifications';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { onNewNotification, offNewNotification } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Lấy thông báo
  const fetchNotifications = useCallback(async (pageNum = 1) => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    const response = await getNotifications(pageNum, 20);
    setNotifications(response.data);
    setTotalPages(response.pagination.last_page);
    setIsLoading(false);
  }, [isAuthenticated]);

  // Lấy số lượng chưa đọc
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    const count = await getNotificationCount();
    setUnreadCount(count);
  }, [isAuthenticated]);

  // Xử lý khi nhấp vào thông báo
  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === 0) {
      await markNotificationAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, status: 1 } : n)
      );
    }
    router.push(getNotificationUrl(notification));
  };

  // Xử lý đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, status: 1 })));
  };

  // Xử lý thông báo thời gian thực mới
  const handleNewNotification = useCallback((notification: RealtimeNotification) => {
    if (notification.ownid !== user?.id) return;
    setUnreadCount(prev => prev + 1);
    setNotifications(prev => {
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
      return [newNotification, ...prev.slice(0, 19)];
    });
  }, [user?.id]);

  // Lọc thông báo
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => n.status === 0)
    : notifications;

  // Lấy dữ liệu ban đầu
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(page);
      fetchUnreadCount();
    }
  }, [isAuthenticated, page, fetchNotifications, fetchUnreadCount]);

  // Đăng ký nhận thông báo thời gian thực
  useEffect(() => {
    if (!user) return;
    onNewNotification(handleNewNotification);
    return () => offNewNotification(handleNewNotification);
  }, [user, onNewNotification, offNewNotification, handleNewNotification]);

  // Chuyển hướng nếu chưa xác thực
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-3xl">
        {/* Tiêu đề */}
        <div className="bg-white rounded-t-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Thông báo</h1>
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo chưa đọc'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* Tab bộ lọc */}
          <div className="flex gap-4 mt-4 border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`pb-2 px-1 font-medium transition-colors ${
                filter === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`pb-2 px-1 font-medium transition-colors relative ${
                filter === 'unread'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Chưa đọc
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Danh sách thông báo */}
        <div className="bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-lg font-medium">
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              </p>
              <p className="text-sm mt-1">
                {filter === 'unread'
                  ? 'Tuyệt vời! Bạn đã xem hết tất cả.'
                  : 'Khi có thông báo, chúng sẽ hiển thị ở đây.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                    notification.status === 0 ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-4 p-4">
                    {/* Biểu tượng thông báo */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                      notification.status === 0 ? 'bg-blue-100 ring-2 ring-blue-200' : 'bg-gray-100'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Nội dung thông báo */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-medium ${
                        notification.status === 0 ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {formatNotificationMessage(notification)}
                      </p>
                      {notification.content && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {notification.content}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>

                    {/* Chỉ thị chưa đọc */}
                    {notification.status === 0 && (
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Phân trang */}
          {!isLoading && filteredNotifications.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} của {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp
              </button>
            </div>
          )}
        </div>

        {/* Quay lại trang chủ */}
        <div className="mt-4 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
