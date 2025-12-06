'use client';

/**
 * Engagement Buttons Component - Like, Dislike, Share, Comment buttons
 * Features real-time updates and smooth animations
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useEngagement } from '@/contexts/EngagementContext';
import { useGroupEngagement } from '@/contexts/GroupEngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { Engagement } from '@/lib/engagementService';
import { GroupEngagement } from '@/lib/groupEngagementService';
import { handleSocialShare } from '@/lib/shareUtils';
import { ShareToast } from '@/components/ShareToast';
import { posts } from '@/lib/api';

interface EngagementButtonsProps {
  postId?: number;
  entityId?: number;
  entityType?: 'post' | 'group-post';
  postType?: string; // Any value = group post, null/undefined = regular post
  isGroupPost?: boolean; // Explicit flag to override detection
  postTitle?: string;
  postSlug?: string;
  postText?: string;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export function EngagementButtons({
  postId,
  entityId,
  entityType,
  postType,
  isGroupPost,
  postTitle = 'Xem bài viết này',
  postSlug,
  postText,
  className = '',
  showLabels = true,
  compact = false,
}: EngagementButtonsProps) {
  // Support both old postId prop and new entityId/entityType pattern
  const id = postId ?? entityId;

  // Determine type based on priority:
  // 1. Explicit isGroupPost flag
  // 2. Explicit entityType
  // 3. Check postType: if it has any value, it's a group post
  // 4. Default to 'post'
  let type: 'post' | 'group-post' = 'post';

  if (isGroupPost === true) {
    type = 'group-post';
  } else if (isGroupPost === false) {
    type = 'post';
  } else if (entityType === 'group-post') {
    type = 'group-post';
  } else if (entityType === 'post') {
    type = 'post';
  } else if (postType) {
    // postType has any value = group post
    type = 'group-post';
  }
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Use appropriate engagement context based on post type
  const regularEngagement = useEngagement();
  const groupEngagement = useGroupEngagement();

  const {
    engagements,
    toggleLike,
    toggleDislike,
    sharePost,
    likeLoading,
    dislikeLoading,
    shareLoading,
    fetchEngagementStats,
  } = type === 'group-post' ? groupEngagement : regularEngagement;

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isShareToWallLoading, setIsShareToWallLoading] = useState(false);
  const { user } = useAuth();
  const engagement = engagements.get(id!);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Load engagement stats on mount
  useEffect(() => {
    if (!engagement && id) {
      fetchEngagementStats(id);
    }
  }, [id, engagement, fetchEngagementStats]);

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
    toggleLike(id!);
  };

  const handleDislikeClick = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    toggleDislike(id!);
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
      // Track share in backend (only for regular posts)
      if (type === 'post') {
        await sharePost(id!, platform);
      }
      setShowShareMenu(false);

      // Open social media share dialog
      await handleSocialShare(platform, id!, postTitle, postSlug, postText);

      // Show success message for direct link
      if (platform === 'direct') {
        setToastMessage('Đã sao chép liên kết!');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleCommentClick = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Try to scroll to comments section on current page
    const commentsElement = document.getElementById(`comments-section-${id}`);
    if (commentsElement) {
      commentsElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If comments section not found, navigate to post page
      router.push(`/posts/${id}?scrollToComments=true`);
    }
  };

  const handleShareToMyWall = async () => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!postId) {
      console.error('[EngagementButtons] Cannot share: postId is undefined');
      setToastMessage('Không thể chia sẻ: thiếu ID bài viết');
      setShowToast(true);
      return;
    }

    setIsShareToWallLoading(true);
    try {
      console.log('[EngagementButtons] Sharing post to my wall', {
        postId,
        wallId: user.id,
      });

      await posts.shareToWall(postId, user.id);
      setToastMessage('Đã chia sẻ lên tường của bạn!');
      setShowToast(true);
      setShowShareMenu(false);

      console.log('[EngagementButtons] Post shared to wall successfully');
    } catch (error: any) {
      console.error('[EngagementButtons] Failed to share to wall:', error);
      setToastMessage(error.message || 'Không thể chia sẻ lên tường');
      setShowToast(true);
    } finally {
      setIsShareToWallLoading(false);
    }
  };

  const isLikeLoading = id ? likeLoading.has(id) : false;
  const isDislikeLoading = id ? dislikeLoading.has(id) : false;
  const isShareLoading = id ? shareLoading.has(id) : false;

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
            : 'bg-blue-100 text-gray-700 hover:bg-blue-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isAuthenticated ? 'Thích bài viết' : 'Đăng nhập để thích bài viết'}
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
            : 'bg-red-100 text-red-700 hover:bg-red-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isAuthenticated ? 'Không thích bài viết' : 'Đăng nhập để không thích bài viết'}
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
        disabled={isShareLoading}
        className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isAuthenticated ? 'Chia sẻ bài viết' : 'Đăng nhập để chia sẻ bài viết'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 18 18">
          <path d="M15.6097 4.09082L6.65039 9.11104" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
          <path d="M7.79128 14.439C8.00463 15.3275 8.11131 15.7718 8.33426 15.932C8.52764 16.071 8.77617 16.1081 9.00173 16.0318C9.26179 15.9438 9.49373 15.5501 9.95761 14.7628L15.5444 5.2809C15.8883 4.69727 16.0603 4.40546 16.0365 4.16566C16.0159 3.95653 15.9071 3.76612 15.7374 3.64215C15.5428 3.5 15.2041 3.5 14.5267 3.5H3.71404C2.81451 3.5 2.36474 3.5 2.15744 3.67754C1.97758 3.83158 1.88253 4.06254 1.90186 4.29856C1.92415 4.57059 2.24363 4.88716 2.88259 5.52032L6.11593 8.7243C6.26394 8.87097 6.33795 8.94431 6.39784 9.02755C6.451 9.10144 6.4958 9.18101 6.53142 9.26479C6.57153 9.35916 6.59586 9.46047 6.64451 9.66309L7.79128 14.439Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
        </svg>
        <span className="flex items-center gap-1">
          {isShareLoading ? '...' : engagement.shares.count}
          
        </span>
      </button>

      {/* Comments Button - Link to comments section */}
      <button
        className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={handleCommentClick}
        title={isAuthenticated ? 'Xem bình luận' : 'Đăng nhập để bình luận'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="flex items-center gap-1">
          {engagement.comments.count}
          
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
            {/* Share to My Wall */}
            <button
              onClick={handleShareToMyWall}
              disabled={isShareToWallLoading}
              className="w-full text-left px-4 py-2 hover:bg-purple-50 rounded flex items-center gap-2 border-b border-gray-300 mb-2 pb-2 disabled:opacity-50"
            >
              <span>{isShareToWallLoading ? '⏳' : '📌'}</span> Chia sẻ lên tường
            </button>

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
              <span>🔗</span> Sao chép liên kết
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

export default EngagementButtons;
