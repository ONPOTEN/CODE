'use client';

/**
 * Engagement Buttons Component - Like, Dislike, Share, Comment buttons
 * Features real-time updates and smooth animations
 */

import React, { useState, useEffect } from 'react';
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
  postTitle = 'Check out this post',
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

  // Load engagement stats on mount
  useEffect(() => {
    if (!engagement && id) {
      fetchEngagementStats(id);
    }
  }, [id, engagement, fetchEngagementStats]);

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
        setToastMessage('Link copied to clipboard!');
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
    document.getElementById(`comments-section-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleShareToMyWall = async () => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    setIsShareToWallLoading(true);
    try {
      console.log('[EngagementButtons] Sharing post to my wall', {
        postId,
        wallId: user.id,
      });

      await posts.shareToWall(postId, user.id);
      setToastMessage('Post shared to your wall!');
      setShowToast(true);
      setShowShareMenu(false);

      console.log('[EngagementButtons] Post shared to wall successfully');
    } catch (error: any) {
      console.error('[EngagementButtons] Failed to share to wall:', error);
      setToastMessage(error.message || 'Failed to share to wall');
      setShowToast(true);
    } finally {
      setIsShareToWallLoading(false);
    }
  };

  const isLikeLoading = likeLoading.has(postId);
  const isDislikeLoading = dislikeLoading.has(postId);
  const isShareLoading = shareLoading.has(postId);

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
        }`}
        title={isAuthenticated ? 'Like this post' : 'Login to like this post'}
      >
        <span className="text-lg">👍</span>
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
        }`}
        title={isAuthenticated ? 'Dislike this post' : 'Login to dislike this post'}
      >
        <span className="text-lg">👎</span>
        <span className="flex items-center gap-1">
          {isDislikeLoading ? '...' : engagement.dislikes.count}
          {showLabels && <span className="hidden sm:inline">Dislike</span>}
        </span>
      </button>

      {/* Share Button with Platform Menu */}
      <div className="relative z-40">
        <button
          onClick={handleShareClick}
          disabled={isShareLoading}
          className={`${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`}
          title={isAuthenticated ? 'Share this post' : 'Login to share this post'}
        >
          <span className="text-lg">📤</span>
          <span className="flex items-center gap-1">
            {isShareLoading ? '...' : engagement.shares.count}
            {showLabels && <span className="hidden sm:inline">Share</span>}
          </span>
        </button>

        {/* Share Platform Menu */}
        {showShareMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] fixed-menu" style={{ zIndex: 9999 }}>
            <div className="p-2">
              {/* Share to My Wall */}
              <button
                onClick={handleShareToMyWall}
                disabled={isShareToWallLoading}
                className="w-full text-left px-4 py-2 hover:bg-purple-50 rounded flex items-center gap-2 border-b border-gray-200 mb-2 pb-2 disabled:opacity-50"
              >
                <span>{isShareToWallLoading ? '⏳' : '📌'}</span> Share to My Wall
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
        onClick={handleCommentClick}
        title={isAuthenticated ? 'View comments' : 'Login to comment'}
      >
        <span className="text-lg">💬</span>
        <span className="flex items-center gap-1">
          {engagement.comments.count}
          {showLabels && <span className="hidden sm:inline">Comment</span>}
        </span>
      </button>
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
