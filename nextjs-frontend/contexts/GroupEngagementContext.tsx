'use client';

/**
 * Group Engagement Context - State management for group post engagement (likes, dislikes, comments)
 * Provides real-time updates via Socket.io
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import groupEngagementService, { GroupEngagement, GroupComment } from '@/lib/groupEngagementService';

interface GroupEngagementContextType {
  // Engagement data
  engagements: Map<number, GroupEngagement>;
  comments: Map<number, GroupComment[]>;
  commentLoading: Map<number, boolean>;

  // Loading states
  likeLoading: Map<number, boolean>;
  dislikeLoading: Map<number, boolean>;

  // Actions
  toggleLike: (postId: number) => Promise<void>;
  toggleDislike: (postId: number) => Promise<void>;
  addComment: (postId: number, content: string, parentId?: number) => Promise<void>;
  updateComment: (commentId: number, content: string) => Promise<void>;
  deleteComment: (postId: number, commentId: number) => Promise<void>;
  fetchEngagementStats: (postId: number) => Promise<void>;
  fetchComments: (postId: number, page?: number) => Promise<void>;
  fetchLikes: (postId: number, page?: number) => Promise<any>;

  // Real-time
  socketConnected: boolean;
  socketError: string | null;
}

const GroupEngagementContext = createContext<GroupEngagementContextType | undefined>(undefined);

export function GroupEngagementProvider({ children, token }: { children: React.ReactNode; token: string }) {
  const [engagements, setEngagements] = useState<Map<number, GroupEngagement>>(new Map());
  const [comments, setComments] = useState<Map<number, GroupComment[]>>(new Map());
  const [likeLoading, setLikeLoading] = useState<Map<number, boolean>>(new Map());
  const [dislikeLoading, setDislikeLoading] = useState<Map<number, boolean>>(new Map());
  const [commentLoading, setCommentLoading] = useState<Map<number, boolean>>(new Map());
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  // Initialize service with token
  useEffect(() => {
    if (token) {
      groupEngagementService.setToken(token);
    }
  }, [token]);

  // Fetch engagement stats
  const fetchEngagementStats = useCallback(async (postId: number) => {
    try {
      const stats = await groupEngagementService.getGroupPostEngagementStats(postId);
      setEngagements((prev) => {
        const updated = new Map(prev);
        updated.set(postId, stats);
        return updated;
      });
    } catch (error) {
      console.error(`Failed to fetch engagement stats for group post ${postId}:`, error);
    }
  }, []);

  // Toggle like
  const toggleLike = useCallback(
    async (postId: number) => {
      try {
        setLikeLoading((prev) => new Map(prev).set(postId, true));
        const engagement = engagements.get(postId);

        if (engagement?.likes.user_liked) {
          await groupEngagementService.unlikeGroupPost(postId);
        } else {
          await groupEngagementService.likeGroupPost(postId);
        }

        // Refresh stats
        await fetchEngagementStats(postId);
      } catch (error) {
        console.error(`Failed to toggle like for group post ${postId}:`, error);
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
          await groupEngagementService.removeDislikeGroupPost(postId);
        } else {
          await groupEngagementService.dislikeGroupPost(postId);
        }

        // Refresh stats
        await fetchEngagementStats(postId);
      } catch (error) {
        console.error(`Failed to toggle dislike for group post ${postId}:`, error);
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

  // Fetch comments
  const fetchComments = useCallback(async (postId: number, page: number = 1) => {
    try {
      setCommentLoading((prev) => new Map(prev).set(postId, true));
      const response = await groupEngagementService.getGroupPostComments(postId, page);

      setComments((prev) => {
        const updated = new Map(prev);
        updated.set(postId, response.data || []);
        return updated;
      });
    } catch (error) {
      console.error(`Failed to fetch comments for group post ${postId}:`, error);
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
        await groupEngagementService.addGroupPostComment(postId, content, parentId);
        // Refresh comments
        await fetchComments(postId);
        // Refresh engagement stats to update comment count
        await fetchEngagementStats(postId);
      } catch (error) {
        console.error(`Failed to add comment to group post ${postId}:`, error);
        throw error;
      }
    },
    [fetchComments, fetchEngagementStats]
  );

  // Update comment
  const updateComment = useCallback(async (commentId: number, content: string) => {
    try {
      await groupEngagementService.updateGroupPostComment(commentId, content);
    } catch (error) {
      console.error(`Failed to update comment ${commentId}:`, error);
      throw error;
    }
  }, []);

  // Delete comment
  const deleteComment = useCallback(
    async (postId: number, commentId: number) => {
      try {
        await groupEngagementService.deleteGroupPostComment(commentId);
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

  // Fetch likes
  const fetchLikes = useCallback(async (postId: number, page: number = 1) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/group-posts/${postId}/likes?page=${page}`);
      if (!response.ok) {
        throw new Error('Failed to fetch likes');
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch likes for group post ${postId}:`, error);
      throw error;
    }
  }, []);

  const value: GroupEngagementContextType = {
    engagements,
    comments,
    commentLoading,
    likeLoading,
    dislikeLoading,
    toggleLike,
    toggleDislike,
    addComment,
    updateComment,
    deleteComment,
    fetchEngagementStats,
    fetchComments,
    fetchLikes,
    socketConnected,
    socketError,
  };

  return (
    <GroupEngagementContext.Provider value={value}>
      {children}
    </GroupEngagementContext.Provider>
  );
}

export function useGroupEngagement() {
  const context = useContext(GroupEngagementContext);
  if (!context) {
    // Return a dummy context if not within provider (for regular posts)
    return {
      engagements: new Map(),
      comments: new Map(),
      commentLoading: new Map(),
      likeLoading: new Map(),
      dislikeLoading: new Map(),
      shareLoading: new Map(), // Add missing shareLoading
      toggleLike: async () => {},
      toggleDislike: async () => {},
      sharePost: async () => {}, // Add missing sharePost
      addComment: async () => {},
      updateComment: async () => {},
      deleteComment: async () => {},
      fetchEngagementStats: async () => {},
      fetchComments: async () => {},
      fetchLikes: async () => Promise.resolve({}),
      fetchShares: async () => Promise.resolve({}), // Add missing fetchShares
      socketConnected: false,
      socketError: null,
    } as GroupEngagementContextType;
  }
  return context;
}
