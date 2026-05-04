'use client';

import Link from 'next/link';

export interface FacebookNotification {
  id: string;
  username: string;
  avatar?: string;
  avatarFallback?: string;
  message: string;
  content?: string;
  time: string;
  isUnread?: boolean;
  href?: string;
  postImage?: string;
  groupAvatar?: string;
}

interface FacebookNotificationListProps {
  notifications: FacebookNotification[];
  onRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export default function FacebookNotificationList({
  notifications,
  onRead,
  onMarkAllRead,
}: FacebookNotificationListProps) {
  const hasUnread = notifications.some(n => n.isUnread);

  const handleRead = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRead) onRead(id);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 text-sm">Thông báo</h3>
        {hasUnread && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="divide-y divide-gray-100">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-2 opacity-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <p className="text-sm">Không có thông báo</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.href || '#'}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                notification.isUnread ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
              }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 relative">
                {notification.avatar ? (
                  <img
                    src={notification.avatar}
                    alt={notification.username}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                    {notification.avatarFallback || notification.username.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Type icon badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center border-2 border-white">
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Username + Message + Time */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-900 leading-tight">
                    <span className="font-semibold hover:underline cursor-pointer">{notification.username}</span>
                    <span className="text-gray-900"> {notification.message}</span>
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                    {notification.time}
                  </span>
                </div>

                {/* Content preview */}
                {notification.content && (
                  <p className="text-sm text-gray-600 mt-0.5 truncate leading-snug">
                    {notification.content}
                  </p>
                )}

                {/* Action buttons */}
                {notification.isUnread && onRead && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={(e) => handleRead(e, notification.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Đã đọc
                    </button>
                  </div>
                )}
              </div>

              {/* Post thumbnail (optional) */}
              {notification.postImage && (
                <div className="flex-shrink-0">
                  <img
                    src={notification.postImage}
                    alt="Post"
                    className="w-12 h-12 rounded object-cover"
                  />
                </div>
              )}

              {/* Unread indicator */}
              {notification.isUnread && (
                <div className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5" />
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
