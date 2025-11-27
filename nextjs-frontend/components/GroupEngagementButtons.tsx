'use client';

/**
 * Group Engagement Buttons Component - Like, Dislike, Comment buttons for group posts
 * Features real-time updates and smooth animations
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGroupEngagement } from '@/contexts/GroupEngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { GroupEngagement } from '@/lib/groupEngagementService';
import { handleSocialShare } from '@/lib/shareUtils';
import { ShareToast } from '@/components/ShareToast';

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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { user } = useAuth();
  const engagement = engagements.get(postId);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Load engagement stats on mount
  useEffect(() => {
    if (!engagement && postId) {
      fetchEngagementStats(postId);
    }
  }, [postId, engagement, fetchEngagementStats]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showShareMenu]);

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

  const handleShareClick = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setShowShareMenu(!showShareMenu);
  };

  const handleShare = async (platform: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    try {
      setShowShareMenu(false);
      await handleSocialShare(platform, postId, postTitle, '', '');

      if (platform === 'direct') {
        setToastMessage('Link copied to clipboard!');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const isLikeLoading = likeLoading.has(postId);
  const isDislikeLoading = dislikeLoading.has(postId);

  const baseButtonClasses = `transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
    compact ? 'px-2 py-1 text-xs' : ''
  }`;

  return (
    <>
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
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 18 18">
          <path d="M1.34375 7.53125L1.34375 7.54043C1.34374 8.04211 1.34372 8.76295 1.6611 9.65585C1.9795 10.5516 2.60026 11.5779 3.77681 12.7544C5.59273 14.5704 7.58105 16.0215 8.33387 16.5497C8.73525 16.8313 9.26573 16.8313 9.66705 16.5496C10.4197 16.0213 12.4074 14.5703 14.2232 12.7544C15.3997 11.5779 16.0205 10.5516 16.3389 9.65585C16.6563 8.76296 16.6563 8.04211 16.6562 7.54043V7.53125C16.6562 5.23466 15.0849 3.25 12.6562 3.25C11.5214 3.25 10.6433 3.78244 9.99228 4.45476C9.59009 4.87012 9.26356 5.3491 9 5.81533C8.73645 5.3491 8.40991 4.87012 8.00772 4.45476C7.35672 3.78244 6.47861 3.25 5.34375 3.25C2.9151 3.25 1.34375 5.23466 1.34375 7.53125Z" />
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
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.808 1.393l18.384 18.385-1.414 1.414-3.747-3.747L12 21.485 3.52 12.993c-2.04-2.284-2.028-5.753.034-8.023L1.393 2.808l1.415-1.415zm17.435 3.364c2.262 2.268 2.34 5.88.236 8.236l-1.635 1.636L7.26 3.046c1.67-.207 3.408.288 4.741 1.483 2.349-2.109 5.979-2.039 8.242.228z"/>
        </svg>
        <span className="flex items-center gap-1">
          {isDislikeLoading ? '...' : engagement.dislikes.count}
          {showLabels && <span className="hidden sm:inline">Dislike</span>}
        </span>
      </button>

      {/* Share Button */}
      <button
        onClick={handleShareClick}
        className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`}
        title={isAuthenticated ? 'Share this post' : 'Login to share this post'}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 18 18">
          <path d="M15.6097 4.09082L6.65039 9.11104" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" fill="none"></path><path d="M7.79128 14.439C8.00463 15.3275 8.11131 15.7718 8.33426 15.932C8.52764 16.071 8.77617 16.1081 9.00173 16.0318C9.26179 15.9438 9.49373 15.5501 9.95761 14.7628L15.5444 5.2809C15.8883 4.69727 16.0603 4.40546 16.0365 4.16566C16.0159 3.95653 15.9071 3.76612 15.7374 3.64215C15.5428 3.5 15.2041 3.5 14.5267 3.5H3.71404C2.81451 3.5 2.36474 3.5 2.15744 3.67754C1.97758 3.83158 1.88253 4.06254 1.90186 4.29856C1.92415 4.57059 2.24363 4.88716 2.88259 5.52032L6.11593 8.7243C6.26394 8.87097 6.33795 8.94431 6.39784 9.02755C6.451 9.10144 6.4958 9.18101 6.53142 9.26479C6.57153 9.35916 6.59586 9.46047 6.64451 9.66309L7.79128 14.439Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25"></path>
        </svg>
        <span className="flex items-center gap-1">
          {showLabels && <span className="hidden sm:inline">Share</span>}
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
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 18 18">
          <path d="M15.376 13.2177L16.2861 16.7955L12.7106 15.8848C12.6781 15.8848 12.6131 15.8848 12.5806 15.8848C11.3779 16.5678 9.94767 16.8931 8.41995 16.7955C4.94194 16.5353 2.08152 13.7381 1.72397 10.2578C1.2689 5.63919 5.13697 1.76863 9.75264 2.22399C13.2307 2.58177 16.0261 5.41151 16.2861 8.92429C16.4161 10.453 16.0586 11.8841 15.376 13.0876C15.376 13.1526 15.376 13.1852 15.376 13.2177Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.25" fill="none"></path>
        </svg>
        <span className="flex items-center gap-1">
          {engagement.comments.count}
          {showLabels && <span className="hidden sm:inline">Comment</span>}
        </span>
      </button>

      {/* Share Platform Menu - Fixed positioning at front */}
      {showShareMenu && (
        <div
          ref={shareMenuRef}
          className="fixed bg-gray-50 rounded-lg shadow-2xl border border-gray-300 z-50 w-48"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="p-2">
            {/* Social Media Shares */}
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
              className="w-full text-left px-4 py-2 hover:bg-white rounded flex items-center gap-2"
            >
              <span>✉️</span> Email
            </button>
            <button
              onClick={() => handleShare('direct')}
              className="w-full text-left px-4 py-2 hover:bg-white rounded flex items-center gap-2 border-t border-gray-300 mt-2 pt-2"
            >
              <span>🔗</span> Direct Link
            </button>
          </div>
        </div>
      )}
    </div>

    <ShareToast
      message={toastMessage}
      isVisible={showToast}
      onClose={() => setShowToast(false)}
    />
  </>
  );
}

export default GroupEngagementButtons;
