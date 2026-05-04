'use client';

import Image from 'next/image';

export interface FacebookNotificationProps {
  username: string;
  avatar?: string;
  avatarFallback?: string;
  message: string;
  content?: string;
  time: string;
  isUnread?: boolean;
  href?: string;
  onRead?: () => void;
}

export default function FacebookNotification({
  username,
  avatar,
  avatarFallback,
  message,
  content,
  time,
  isUnread = false,
  href,
  onRead,
}: FacebookNotificationProps) {
  const handleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRead) onRead();
  };

  const notificationContent = (
    <div className={`flex items-start gap-2 px-3 py-2 ${isUnread ? 'bg-gray-100' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
            {avatarFallback || username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content - exact structure */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-900 leading-tight">
            <span className="font-medium">{username}</span> {message}
          </p>
          {isUnread && (
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
          {time}
        </p>
      </div>

      {/* Unread indicator */}
      {isUnread && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:bg-gray-50 transition-colors">
        {notificationContent}
      </a>
    );
  }

  return notificationContent;
}
