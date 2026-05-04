'use client';

import Link from 'next/link';
import Image from 'next/image';

export interface NotificationItemProps {
  id: string;
  username: string;
  avatar?: string;
  avatarFallback?: string;
  message: string;
  content?: string;
  time: string | Date;
  isUnread?: boolean;
  href?: string;
  onRead?: (id: string) => void;
}

export default function NotificationItem({
  username,
  avatar,
  avatarFallback,
  message,
  content,
  time,
  isUnread = false,
  href,
  onRead,
}: NotificationItemProps) {
  const formatTime = (time: string | Date) => {
    if (typeof time === 'string') {
      // If it's already formatted like "2/12/2026, 10:05:38 PM", return as is
      return time;
    }
    const date = new Date(time);
    return date.toLocaleString('vi-VN', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRead = () => {
    if (onRead) {
      onRead('');
    }
  };

  const contentComponent = (
    <div className={`flex items-start gap-3 px-3 py-2 transition-colors ${
      isUnread ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
    }`}>
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        {avatar ? (
          <img
            src={avatar}
            alt={username}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
            {avatarFallback || username.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Icon type - optional */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center border-2 border-white">
          <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-900 leading-snug">
            <span className="font-semibold hover:underline cursor-pointer">{username}</span>
            <span className="text-gray-900"> {message}</span>
          </p>
          {/* Unread dot */}
          {isUnread && (
            <div className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5"></div>
          )}
        </div>

        {content && (
          <p className="text-sm text-gray-600 mt-0.5 truncate leading-snug">
            {content}
          </p>
        )}

        {/* Time + Mark as read button */}
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400 leading-tight">
            {formatTime(time)}
          </p>
          {isUnread && onRead && (
            <button
              onClick={handleRead}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              Đã đọc
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block w-full">
        {contentComponent}
      </Link>
    );
  }

  return contentComponent;
}
