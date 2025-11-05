'use client';

/**
 * Group Engagement Buttons Component - Like, Dislike, Comment buttons for group posts
 * Features real-time updates and smooth animations
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroupEngagement } from '@/contexts/GroupEngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { GroupEngagement } from '@/lib/groupEngagementService';

interface GroupEngagementButtonsProps {
  postId: number;
  postTitle?: string;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export function GroupEngagementButtons({
  postId,
  postTitle = 'Check out this post',
  className = '',
  showLabels = true,
  compact = false,
}: GroupEngagementButtonsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    engagements,
    toggleLike,
    toggleDislike,
    likeLoading,
    dislikeLoading,
    fetchEngagementStats,
  } = useGroupEngagement();

  const [showShareMenu, setShowShareMenu] = useState(false);
  const { user } = useAuth();
  const engagement = engagements.get(postId);

  // Load engagement stats on mount
  useEffect(() => {
    if (!engagement && postId) {
      fetchEngagementStats(postId);
    }
  }, [postId, engagement, fetchEngagementStats]);

  if (!engagement) {
    return <div className={`bg-gray-100 rounded animate-pulse h-12 ${className}`} />;
  }

  const handleLikeClick = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    toggleLike(postId);
  };

  const handleDislikeClick = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    toggleDislike(postId);
  };

  const isLikeLoading = likeLoading.has(postId);
  const isDislikeLoading = dislikeLoading.has(postId);

  const baseButtonClasses = `transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
    compact ? 'px-2 py-1 text-xs' : ''
  }`;

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {/* Like Button */}
      <button
        onClick={handleLikeClick}
        disabled={isLikeLoading}
        className={`${baseButtonClasses} ${
          engagement.likes.user_liked
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Like this post"
      >
        <svg className="w-5 h-5" fill={engagement.likes.user_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 10h4.764a2 2 0 011.789 2.894l-3.646 7.23a2 2 0 01-1.789 1.106H2a2 2 0 01-2-2V8a2 2 0 012-2h1.657a2 2 0 011.414.586l2.828-2.829a2 2 0 112.828 2.829l-.36.36h5.663z"
          />
        </svg>
        <span className="flex items-center gap-1">
          {isLikeLoading ? '...' : engagement.likes.count}
          {showLabels && <span className="hidden sm:inline">Like</span>}
        </span>
      </button>

      {/* Dislike Button */}
      <button
        onClick={handleDislikeClick}
        disabled={isDislikeLoading}
        className={`${baseButtonClasses} ${
          engagement.dislikes.user_disliked
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Dislike this post"
      >
        <svg className="w-5 h-5" fill={engagement.dislikes.user_disliked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.646-7.23a2 2 0 011.789-1.106h10a2 2 0 012 2v8a2 2 0 01-2 2h-1.657a2 2 0 01-1.414-.586l-2.828 2.829a2 2 0 11-2.828-2.829l.36-.36z"
          />
        </svg>
        <span className="flex items-center gap-1">
          {isDislikeLoading ? '...' : engagement.dislikes.count}
          {showLabels && <span className="hidden sm:inline">Dislike</span>}
        </span>
      </button>

      {/* Comments Button */}
      <button
        onClick={() => {
          const commentsSection = document.getElementById(`group-comments-section-${postId}`);
          if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`}
        title="View comments"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <span className="flex items-center gap-1">
          {engagement.comments.count}
          {showLabels && <span className="hidden sm:inline">Comment</span>}
        </span>
      </button>
    </div>
  );
}

export default GroupEngagementButtons;
