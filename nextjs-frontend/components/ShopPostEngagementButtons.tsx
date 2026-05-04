'use client';

/**
 * Shop Post Engagement Buttons Component - Like, Dislike, Share, Comment buttons for shop posts
 * Features real-time updates and smooth animations
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useShopPostEngagement } from '@/contexts/ShopPostEngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { handleShopPostShare } from '@/lib/shareUtils';
import { ShareToast } from '@/components/ShareToast';

interface ShopPostEngagementButtonsProps {
  postId: number;
  shopId: number;
  postTitle?: string;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
  onCommentClick?: () => void;
}

export function ShopPostEngagementButtons({
  postId,
  shopId,
  postTitle = 'Xem sản phẩm này',
  className = '',
  showLabels = true,
  compact = false,
  onCommentClick,
}: ShopPostEngagementButtonsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    engagements,
    toggleLike,
    toggleDislike,
    sharePost,
    likeLoading,
    dislikeLoading,
    fetchEngagementStats,
  } = useShopPostEngagement();

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
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
    setShowShareMenu(!showShareMenu);
  };

  const handleShare = async (platform: string) => {
    try {
      setShowShareMenu(false);

      // Use shop post share function with correct URL format
      await handleShopPostShare(platform, shopId, postId, postTitle);

      // Track share if authenticated
      if (isAuthenticated) {
        try {
          await sharePost(postId, platform);
        } catch (error) {
          console.error('Failed to track share:', error);
        }
      }

      if (platform === 'direct') {
        setToastMessage('Copied link!');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const isLikeLoading = likeLoading.has(postId);
  const isDislikeLoading = dislikeLoading.has(postId);

  const baseButtonClasses = `transition-all duration-200 flex items-center gap-2 rounded-lg font-medium ${
    compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
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
          title="Thích"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="flex items-center gap-1">
            {isLikeLoading ? '...' : engagement.likes.count}
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
          title="Không thích"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M1 1l22 22" />
          </svg>
          <span className="flex items-center gap-1">
            {isDislikeLoading ? '...' : engagement.dislikes.count}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareClick}
          className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`}
          title="Chia sẻ"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 18 18">
            <path d="M15.6097 4.09082L6.65039 9.11104" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
            <path d="M7.79128 14.439C8.00463 15.3275 8.11131 15.7718 8.33426 15.932C8.52764 16.071 8.77617 16.1081 9.00173 16.0318C9.26179 15.9438 9.49373 15.5501 9.95761 14.7628L15.5444 5.2809C15.8883 4.69727 16.0603 4.40546 16.0365 4.16566C16.0159 3.95653 15.9071 3.76612 15.7374 3.64215C15.5428 3.5 15.2041 3.5 14.5267 3.5H3.71404C2.81451 3.5 2.36474 3.5 2.15744 3.67754C1.97758 3.83158 1.88253 4.06254 1.90186 4.29856C1.92415 4.57059 2.24363 4.88716 2.88259 5.52032L6.11593 8.7243C6.26394 8.87097 6.33795 8.94431 6.39784 9.02755C6.451 9.10144 6.4958 9.18101 6.53142 9.26479C6.57153 9.35916 6.59586 9.46047 6.64451 9.66309L7.79128 14.439Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
          </svg>
          <span className="flex items-center gap-1">
            {engagement.shares?.count || 0}
          </span>
        </button>

        {/* Comments Button */}
        <button
          onClick={() => {
            if (onCommentClick) {
              onCommentClick();
            } else {
              const commentsSection = document.getElementById(`shop-post-comments-section-${postId}`);
              if (commentsSection) {
                commentsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }}
          className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`}
          title="Bình luận"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="flex items-center gap-1">
            {engagement.comments.count}
            {showLabels && <span className="hidden sm:inline">Bình luận</span>}
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
                <span>Facebook</span>
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <span>Twitter</span>
              </button>
              <button
                onClick={() => handleShare('whatsapp')}
                className="w-full text-left px-4 py-2 hover:bg-green-50 rounded flex items-center gap-2"
              >
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare('linkedin')}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <span>LinkedIn</span>
              </button>
              <button
                onClick={() => handleShare('email')}
                className="w-full text-left px-4 py-2 hover:bg-white rounded flex items-center gap-2"
              >
                <span>Email</span>
              </button>
              <button
                onClick={() => handleShare('direct')}
                className="w-full text-left px-4 py-2 hover:bg-white rounded flex items-center gap-2 border-t border-gray-300 mt-2 pt-2"
              >
                <span>Sao chép liên kết</span>
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

export default ShopPostEngagementButtons;
