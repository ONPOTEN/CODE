'use client';

import Link from 'next/link';
import Image from 'next/image';

export interface FacebookNotificationItemProps {
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

export default function FacebookNotificationItem({
  id,
  username,
  avatar,
  avatarFallback,
  message,
  content,
  time,
  isUnread = false,
  href,
  onRead,
}: FacebookNotificationItemProps) {
  const formatTime = (time: string | Date) => {
    if (typeof time === 'string') {
      return time;
    }
    const date = new Date(time);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const handleRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRead) {
      onRead(id);
    }
  };

  const innerContent = (
    <div className={`flex items-start gap-2 px-3 py-2 transition-colors ${
      isUnread ? 'bg-gray-100 hover:bg-gray-200' : 'hover:bg-gray-50'
    }`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
            {avatarFallback || username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content - exact structure from user */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-900 leading-tight">
            <span className="font-medium">{username}</span> {message}
          </p>
          {isUnread && onRead && (
            <button
              onClick={handleRead}
              className="text-[8px] text-blue-500 hover:text-blue-600 ml-0.5"
            >
              Đã đọc
            </button>
          )}
        </div>

        {content && (
          <p className="text-[10px] text-gray-500 mt-0 truncate leading-tight">
            {content}
          </p>
        )}

        <p className="text-[8px] text-gray-400 mt-0 leading-tight">
          {formatTime(time)}
        </p>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-1"></div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block w-full">
        {innerContent}
      </Link>
    );
  }

  return innerContent;
}
