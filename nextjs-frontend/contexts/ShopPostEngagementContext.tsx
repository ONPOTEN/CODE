'use client';

/**
 * Shop Post Engagement Context - State management for shop post engagement (likes, dislikes, shares, comments)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import shopPostEngagementService, { ShopPostEngagement, ShopPostComment } from '@/lib/shopPostEngagementService';

interface ShopPostEngagementContextType {
  // Engagement data
  engagements: Map<number, ShopPostEngagement>;
  comments: Map<number, ShopPostComment[]>;
  commentLoading: Map<number, boolean>;

  // Loading states
  likeLoading: Map<number, boolean>;
  dislikeLoading: Map<number, boolean>;
  shareLoading: Map<number, boolean>;

  // Actions
  toggleLike: (postId: number) => Promise<void>;
  toggleDislike: (postId: number) => Promise<void>;
  sharePost: (postId: number, platform: string) => Promise<void>;
  addComment: (postId: number, content: string, parentId?: number) => Promise<void>;
  deleteComment: (postId: number, commentId: number) => Promise<void>;
  fetchEngagementStats: (postId: number) => Promise<void>;
  fetchComments: (postId: number, page?: number) => Promise<void>;
}

const ShopPostEngagementContext = createContext<ShopPostEngagementContextType | undefined>(undefined);

export function ShopPostEngagementProvider({ children, token }: { children: React.ReactNode; token: string }) {
  const [engagements, setEngagements] = useState<Map<number, ShopPostEngagement>>(new Map());
  const [comments, setComments] = useState<Map<number, ShopPostComment[]>>(new Map());
  const [likeLoading, setLikeLoading] = useState<Map<number, boolean>>(new Map());
  const [dislikeLoading, setDislikeLoading] = useState<Map<number, boolean>>(new Map());
  const [shareLoading, setShareLoading] = useState<Map<number, boolean>>(new Map());
  const [commentLoading, setCommentLoading] = useState<Map<number, boolean>>(new Map());

  // Initialize service with token
  useEffect(() => {
    if (token) {
      shopPostEngagementService.setToken(token);
    }
  }, [token]);

  // Fetch engagement stats
  const fetchEngagementStats = useCallback(async (postId: number) => {
    try {
      const stats = await shopPostEngagementService.getEngagementStats(postId);
      setEngagements((prev) => {
        const updated = new Map(prev);
        updated.set(postId, stats);
        return updated;
      });
    } catch (error) {
      console.error(`Failed to fetch engagement stats for shop post ${postId}:`, error);
    }
  }, []);

  // Toggle like
  const toggleLike = useCallback(
    async (postId: number) => {
      try {
        setLikeLoading((prev) => new Map(prev).set(postId, true));
        const engagement = engagements.get(postId);

        if (engagement?.likes.user_liked) {
          await shopPostEngagementService.unlikePost(postId);
        } else {
          await shopPostEngagementService.likePost(postId);
        }

        // Refresh stats
        await fetchEngagementStats(postId);
      } catch (error) {
        console.error(`Failed to toggle like for shop post ${postId}:`, error);
      } finally {
        setLikeLoading((prev) => {
          const updated = new Map(prev);
          updated.delete(postId);
          return updated;
        });
      }
    },
    [engagements, fetchEngagementStats]
  );

  // Toggle dislike
  const toggleDislike = useCallback(
    async (postId: number) => {
      try {
        setDislikeLoading((prev) => new Map(prev).set(postId, true));
        const engagement = engagements.get(postId);

        if (engagement?.dislikes.user_disliked) {
          await shopPostEngagementService.removeDislike(postId);
        } else {
          await shopPostEngagementService.dislikePost(postId);
        }

        // Refresh stats
        await fetchEngagementStats(postId);
      } catch (error) {
        console.error(`Failed to toggle dislike for shop post ${postId}:`, error);
      } finally {
        setDislikeLoading((prev) => {
          const updated = new Map(prev);
          updated.delete(postId);
          return updated;
        });
      }
    },
    [engagements, fetchEngagementStats]
  );

  // Share post
  const sharePost = useCallback(
    async (postId: number, platform: string) => {
      try {
        setShareLoading((prev) => new Map(prev).set(postId, true));
        await shopPostEngagementService.sharePost(postId, platform);
        // Refresh stats to update share count
        await fetchEngagementStats(postId);
      } catch (error) {
        console.error(`Failed to share shop post ${postId}:`, error);
      } finally {
        setShareLoading((prev) => {
          const updated = new Map(prev);
          updated.delete(postId);
          return updated;
        });
      }
    },
    [fetchEngagementStats]
  );

  // Fetch comments
  const fetchComments = useCallback(async (postId: number, page: number = 1) => {
    try {
      setCommentLoading((prev) => new Map(prev).set(postId, true));
      const response = await shopPostEngagementService.getComments(postId, page);

      setComments((prev) => {
        const updated = new Map(prev);
        updated.set(postId, response.data || []);
        return updated;
      });
    } catch (error) {
      console.error(`Failed to fetch comments for shop post ${postId}:`, error);
    } finally {
      setCommentLoading((prev) => {
        const updated = new Map(prev);
        updated.delete(postId);
        return updated;
      });
    }
  }, []);

  // Add comment
  const addComment = useCallback(
    async (postId: number, content: string, parentId?: number) => {
      try {
        await shopPostEngagementService.addComment(postId, content, parentId);
        // Refresh comments
        await fetchComments(postId);
        // Refresh engagement stats to update comment count
        await fetchEngagementStats(postId);
      } catch (error) {
        console.error(`Failed to add comment to shop post ${postId}:`, error);
        throw error;
      }
    },
    [fetchComments, fetchEngagementStats]
  );

  // Delete comment
  const deleteComment = useCallback(
    async (postId: number, commentId: number) => {
      try {
        await shopPostEngagementService.deleteComment(postId, commentId);
        // Refresh comments
        await fetchComments(postId);
        // Refresh engagement stats
        await fetchEngagementStats(postId);
      } catch (error) {
        console.error(`Failed to delete comment ${commentId}:`, error);
        throw error;
      }
    },
    [fetchComments, fetchEngagementStats]
  );

  const value: ShopPostEngagementContextType = {
    engagements,
    comments,
    commentLoading,
    likeLoading,
    dislikeLoading,
    shareLoading,
    toggleLike,
    toggleDislike,
    sharePost,
    addComment,
    deleteComment,
    fetchEngagementStats,
    fetchComments,
  };

  return (
    <ShopPostEngagementContext.Provider value={value}>
      {children}
    </ShopPostEngagementContext.Provider>
  );
}

export function useShopPostEngagement() {
  const context = useContext(ShopPostEngagementContext);
  if (!context) {
    // Return a dummy context if not within provider
    return {
      engagements: new Map(),
      comments: new Map(),
      commentLoading: new Map(),
      likeLoading: new Map(),
      dislikeLoading: new Map(),
      shareLoading: new Map(),
      toggleLike: async () => {},
      toggleDislike: async () => {},
      sharePost: async () => {},
      addComment: async () => {},
      deleteComment: async () => {},
      fetchEngagementStats: async () => {},
      fetchComments: async () => {},
    } as ShopPostEngagementContextType;
  }
  return context;
}
