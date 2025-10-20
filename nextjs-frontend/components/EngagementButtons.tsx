'use client';

/**
 * Engagement Buttons Component - Like, Dislike, Share, Comment buttons
 * Features real-time updates and smooth animations
 */

import React, { useState, useEffect } from 'react';
import { useEngagement } from '@/contexts/EngagementContext';
import { Engagement } from '@/lib/engagementService';

interface EngagementButtonsProps {
  postId: number;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export function EngagementButtons({
  postId,
  className = '',
  showLabels = true,
  compact = false,
}: EngagementButtonsProps) {
  const {
    engagements,
    toggleLike,
    toggleDislike,
    sharePost,
    likeLoading,
    dislikeLoading,
    shareLoading,
    fetchEngagementStats,
  } = useEngagement();

  const [showShareMenu, setShowShareMenu] = useState(false);
  const engagement = engagements.get(postId);

  // Load engagement stats on mount
  useEffect(() => {
    if (!engagement) {
      fetchEngagementStats(postId);
    }
  }, [postId, engagement, fetchEngagementStats]);

  if (!engagement) {
    return <div className={`bg-gray-100 rounded animate-pulse h-12 ${className}`} />;
  }

  const handleShare = async (platform: string) => {
    try {
      await sharePost(postId, platform);
      setShowShareMenu(false);
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const isLikeLoading = likeLoading.has(postId);
  const isDislikeLoading = dislikeLoading.has(postId);
  const isShareLoading = shareLoading.has(postId);

  const baseButtonClasses = `transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
    compact ? 'px-2 py-1 text-xs' : ''
  }`;

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {/* Like Button */}
      <button
        onClick={() => toggleLike(postId)}
        disabled={isLikeLoading}
        className={`${baseButtonClasses} ${
          engagement.likes.user_liked
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Like this post"
      >
        <span className="text-lg">👍</span>
        <span className="flex items-center gap-1">
          {isLikeLoading ? '...' : engagement.likes.count}
          {showLabels && <span className="hidden sm:inline">Like</span>}
        </span>
      </button>

      {/* Dislike Button */}
      <button
        onClick={() => toggleDislike(postId)}
        disabled={isDislikeLoading}
        className={`${baseButtonClasses} ${
          engagement.dislikes.user_disliked
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Dislike this post"
      >
        <span className="text-lg">👎</span>
        <span className="flex items-center gap-1">
          {isDislikeLoading ? '...' : engagement.dislikes.count}
          {showLabels && <span className="hidden sm:inline">Dislike</span>}
        </span>
      </button>

      {/* Share Button with Platform Menu */}
      <div className="relative">
        <button
          onClick={() => setShowShareMenu(!showShareMenu)}
          disabled={isShareLoading}
          className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`}
          title="Share this post"
        >
          <span className="text-lg">📤</span>
          <span className="flex items-center gap-1">
            {isShareLoading ? '...' : engagement.shares.count}
            {showLabels && <span className="hidden sm:inline">Share</span>}
          </span>
        </button>

        {/* Share Platform Menu */}
        {showShareMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-2">
              <button
                onClick={() => handleShare('facebook')}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <span>📘</span> Facebook
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <span>𝕏</span> Twitter
              </button>
              <button
                onClick={() => handleShare('whatsapp')}
                className="w-full text-left px-4 py-2 hover:bg-green-50 rounded flex items-center gap-2"
              >
                <span>💬</span> WhatsApp
              </button>
              <button
                onClick={() => handleShare('linkedin')}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <span>💼</span> LinkedIn
              </button>
              <button
                onClick={() => handleShare('email')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded flex items-center gap-2"
              >
                <span>✉️</span> Email
              </button>
              <button
                onClick={() => handleShare('direct')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded flex items-center gap-2 border-t border-gray-200 mt-2 pt-2"
              >
                <span>🔗</span> Direct Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comments Button - Link to comments section */}
      <button
        className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`}
        onClick={() => document.getElementById(`comments-section-${postId}`)?.scrollIntoView({ behavior: 'smooth' })}
        title="View comments"
      >
        <span className="text-lg">💬</span>
        <span className="flex items-center gap-1">
          {engagement.comments.count}
          {showLabels && <span className="hidden sm:inline">Comment</span>}
        </span>
      </button>
    </div>
  );
}

export default EngagementButtons;
