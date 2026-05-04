'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { friends, ApiException } from '@/lib/api';

interface Author {
  id: number;
  username?: string;
  display_name?: string;
  user_nicename?: string;
  avatar?: string;
  location?: string;
  company?: string;
  role?: string;
  is_friend?: boolean;
  friend_request_sent?: boolean;
}

interface AuthorCardProps {
  author?: Author;
  createdAt: string;
  compact?: boolean;
  showAvatar?: boolean;
}

export function AuthorCard({ author, createdAt, compact = false, showAvatar = false }: AuthorCardProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(author?.friend_request_sent || false);
  const [isFriend, setIsFriend] = useState(author?.is_friend || false);

  if (!author) {
    return null;
  }

  // Lấy trạng thái kết bạn khi mounted hoặc khi tác giả thay đổi
  useEffect(() => {
    if (!isAuthenticated || !currentUser || currentUser.id === author.id) {
      return;
    }

    const fetchFriendshipStatus = async () => {
      try {
        const status = await friends.getStatus(author.id);
        setIsFriend(status.is_friend);
        setRequestSent(status.friend_request_sent);
      } catch (err) {
        console.error('Failed to fetch friendship status:', err);
      }
    };

    fetchFriendshipStatus();
  }, [author.id, isAuthenticated, currentUser]);

  const authorName = author.display_name || author.username || author.user_nicename || 'Ẩn danh';

  const formatDate = (dateString: string) => {
    const postDate = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} tuần trước`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
    return `${Math.floor(diffInSeconds / 31536000)} năm trước`;
  };

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !currentUser) {
      return;
    }

    setIsLoading(true);
    try {
      await friends.sendRequest(author.id);
      setRequestSent(true);
    } catch (err) {
      if (err instanceof ApiException) {
        // Check if error is "already friends" - if so, hide the button
        if (err.message.includes('already friends')) {
          setRequestSent(true);
        }
        console.error('Failed to send friend request:', err.message);
      } else {
        console.error('Failed to send friend request:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowAddFriendButton =
    isAuthenticated &&
    currentUser &&
    currentUser.id !== author.id &&
    !isFriend &&
    !requestSent;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {showAvatar && author.avatar && (
          <img
            src={author.avatar}
            alt={authorName}
            className="w-10 h-10 rounded-full object-cover border border-gray-300"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/users/${author.id}`}
              className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors truncate"
              title={authorName}
            >
              {authorName}
            </Link>
            {shouldShowAddFriendButton && (
              <button
                onClick={handleAddFriend}
                disabled={isLoading}
                className="flex-shrink-0 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading ? '...' : 'Kết bạn'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">{formatDate(createdAt)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 border-b border-gray-300">
      {showAvatar && author.avatar && (
        <Link href={`/users/${author.id}`} className="flex-shrink-0">
          <img
            src={author.avatar}
            alt={authorName}
            className="w-12 h-12 rounded-full object-cover border border-gray-300 hover:border-blue-400 transition-colors"
          />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/users/${author.id}`}
            className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors"
          >
            {authorName}
          </Link>
          {shouldShowAddFriendButton && (
            <button
              onClick={handleAddFriend}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? '...' : 'Add Friend'}
            </button>
          )}
        </div>
        {(author.location || author.company) && (
          <p className="text-sm text-gray-600 mt-1">
            {author.location && <span>{author.location}</span>}
            {author.location && author.company && <span className="mx-2">•</span>}
            {author.company && <span>{author.company}</span>}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1">{formatDate(createdAt)}</p>
      </div>
    </div>
  );
}

export default AuthorCard;
