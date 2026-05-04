'use client';

/**
 * Engagement Context - State management for post engagement (likes, dislikes, shares, comments)
 * Provides real-time updates via Socket.io
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import engagementService, { Engagement, Comment, Share } from '@/lib/engagementService';

interface EngagementContextType {
  // Engagement data
  engagements: Map<number, Engagement>;
  comments: Map<number, Comment[]>;
  commentLoading: Map<number, boolean>;

  // Loading states
  likeLoading: Map<number, boolean>;
  dislikeLoading: Map<number, boolean>;
  shareLoading: Map<number, boolean>;

  // Actions
  toggleLike: (postId: number, type?: 'post' | 'group-post') => Promise<void>;
  toggleDislike: (postId: number, type?: 'post' | 'group-post') => Promise<void>;
  sharePost: (postId: number, platform: string) => Promise<void>;
  addComment: (postId: number, content: string, parentId?: number, image?: File, postOwnerId?: number) => Promise<void>;
  updateComment: (commentId: number, content: string) => Promise<void>;
  deleteComment: (postId: number, commentId: number) => Promise<void>;
  fetchEngagementStats: (postId: number, type?: 'post' | 'group-post') => Promise<void>;
  fetchComments: (postId: number, page?: number) => Promise<void>;
  fetchLikes: (postId: number, page?: number) => Promise<any>;
  fetchShares: (postId: number, page?: number) => Promise<any>;

  // Real-time
  socketConnected: boolean;
  socketError: string | null;
}

const EngagementContext = createContext<EngagementContextType | undefined>(undefined);

export function EngagementProvider({ children, token }: { children: React.ReactNode; token: string }) {
  const [engagements, setEngagements] = useState<Map<number, Engagement>>(new Map());
  const [comments, setComments] = useState<Map<number, Comment[]>>(new Map());
  const [likeLoading, setLikeLoading] = useState<Map<number, boolean>>(new Map());
  const [dislikeLoading, setDislikeLoading] = useState<Map<number, boolean>>(new Map());
  const [shareLoading, setShareLoading] = useState<Map<number, boolean>>(new Map());
  const [commentLoading, setCommentLoading] = useState<Map<number, boolean>>(new Map());
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  // Get user ID from localStorage
  const getUserId = (): number | null => {
    if (typeof window === 'undefined') return null;
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId, 10) : null;
  };

  // Initialize socket connection and set token for HTTP requests
  useEffect(() => {
    if (!token) return;

    const userId = getUserId();
    console.log('[Socket.IO Debug] EngagementProvider initializing socket', {
      hasToken: !!token,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Set token for HTTP requests
    engagementService.setToken(token);

    const initSocket = async () => {
      try {
        await engagementService.initializeSocket(token, userId || 0);
        setSocketConnected(true);
        setSocketError(null);

        // Listen for real-time engagement events
        engagementService.on('like-added', handleLikeAdded);
        engagementService.on('like-removed', handleLikeRemoved);
        engagementService.on('dislike-added', handleDislikeAdded);
        engagementService.on('dislike-removed', handleDislikeRemoved);
        engagementService.on('comment-added', handleCommentAdded);
        engagementService.on('comment-updated', handleCommentUpdated);
        engagementService.on('comment-removed', handleCommentRemoved);
        engagementService.on('share-added', handleShareAdded);
        engagementService.on('disconnected', () => setSocketConnected(false));
      } catch (error) {
        console.error('Failed to initialize engagement socket:', error);
        setSocketError(error instanceof Error ? error.message : 'Connection failed');
      }
    };

    initSocket();

    return () => {
      engagementService.off('like-added', handleLikeAdded);
      engagementService.off('like-removed', handleLikeRemoved);
      engagementService.off('dislike-added', handleDislikeAdded);
      engagementService.off('dislike-removed', handleDislikeRemoved);
      engagementService.off('comment-added', handleCommentAdded);
      engagementService.off('comment-updated', handleCommentUpdated);
      engagementService.off('comment-removed', handleCommentRemoved);
      engagementService.off('share-added', handleShareAdded);
      engagementService.disconnect();
    };
  }, [token]);

  // Handle real-time like added
  const handleLikeAdded = useCallback((data: any) => {
    const { post_id, likes_count } = data;
    setEngagements((prev) => {
      const updated = new Map(prev);
      const engagement = updated.get(post_id) || {
        likes: { count: 0, user_liked: false },
        dislikes: { count: 0, user_disliked: false },
        comments: { count: 0 },
        shares: { count: 0 },
      };
      engagement.likes.count = likes_count;
      updated.set(post_id, engagement);
      return updated;
    });
  }, []);

  // Handle real-time like removed
  const handleLikeRemoved = useCallback((data: any) => {
    const { post_id, likes_count } = data;
    setEngagements((prev) => {
      const updated = new Map(prev);
      const engagement = updated.get(post_id);
      if (engagement) {
        engagement.likes.count = likes_count;
        updated.set(post_id, engagement);
      }
      return updated;
    });
  }, []);

  // Handle real-time dislike added
  const handleDislikeAdded = useCallback((data: any) => {
    const { post_id, dislikes_count } = data;
    setEngagements((prev) => {
      const updated = new Map(prev);
      const engagement = updated.get(post_id) || {
        likes: { count: 0, user_liked: false },
        dislikes: { count: 0, user_disliked: false },
        comments: { count: 0 },
        shares: { count: 0 },
      };
      engagement.dislikes.count = dislikes_count;
      updated.set(post_id, engagement);
      return updated;
    });
  }, []);

  // Handle real-time dislike removed
  const handleDislikeRemoved = useCallback((data: any) => {
    const { post_id, dislikes_count } = data;
    setEngagements((prev) => {
      const updated = new Map(prev);
      const engagement = updated.get(post_id);
      if (engagement) {
        engagement.dislikes.count = dislikes_count;
        updated.set(post_id, engagement);
      }
      return updated;
    });
  }, []);

  // Handle real-time comment added
  const handleCommentAdded = useCallback((data: any) => {
    console.log('[Socket.IO Debug] Received comment-added event', {
      timestamp: new Date().toISOString(),
      postId: data.post_id,
      commentId: data.comment?.id,
      commentAuthor: data.comment?.author?.name || data.comment?.author_name,
      socketConnected,
    });
    const { post_id, comment } = data;
    setComments((prev) => {
      const updated = new Map(prev);
      const postComments = updated.get(post_id) || [];
      updated.set(post_id, [comment, ...postComments]);
      return updated;
    });

    // Update engagement count
    setEngagements((prev) => {
      const updated = new Map(prev);
      const engagement = updated.get(post_id);
      if (engagement) {
        engagement.comments.count += 1;
        updated.set(post_id, engagement);
      }
      return updated;
    });
  }, [socketConnected]);

  // Handle real-time comment updated
  const handleCommentUpdated = useCallback((data: any) => {
    const { comment } = data;
    setComments((prev) => {
      const updated = new Map(prev);
      const postComments = updated.get(comment.post_id) || [];
      const index = postComments.findIndex((c) => c.id === comment.id);
      if (index !== -1) {
        postComments[index] = comment;
        updated.set(comment.post_id, postComments);
      }
      return updated;
    });
  }, []);

  // Handle real-time comment removed
  const handleCommentRemoved = useCallback((data: any) => {
    const { post_id, comment_id } = data;
    setComments((prev) => {
      const updated = new Map(prev);
      const postComments = updated.get(post_id) || [];
      updated.set(post_id, postComments.filter((c) => c.id !== comment_id));
      return updated;
    });

    // Update engagement count
    setEngagements((prev) => {
      const updated = new Map(prev);
      const engagement = updated.get(post_id);
      if (engagement) {
        engagement.comments.count = Math.max(0, engagement.comments.count - 1);
        updated.set(post_id, engagement);
      }
      return updated;
    });
  }, []);

  // Handle real-time share added
  const handleShareAdded = useCallback((data: any) => {
    const { post_id, shares_count } = data;
    setEngagements((prev) => {
      const updated = new Map(prev);
      const engagement = updated.get(post_id);
      if (engagement) {
        engagement.shares.count = shares_count;
        updated.set(post_id, engagement);
      }
      return updated;
    });
  }, []);

  // Fetch engagement stats
  const fetchEngagementStats = useCallback(async (postId: number, type: 'post' | 'group-post' = 'post') => {
    try {
      const stats = await engagementService.getEngagementStats(postId, type);
      setEngagements((prev) => {
        const updated = new Map(prev);
        updated.set(postId, stats);
        return updated;
      });
    } catch (error) {
      console.error(`Failed to fetch engagement stats for ${type} ${postId}:`, error);
    }
  }, []);

  // Toggle like
  const toggleLike = useCallback(
    async (postId: number, type: 'post' | 'group-post' = 'post') => {
      try {
        setLikeLoading((prev) => new Map(prev).set(postId, true));
        const engagement = engagements.get(postId);

        if (engagement?.likes.user_liked) {
          await engagementService.unlikePost(postId, type);
        } else {
          await engagementService.likePost(postId, type);
        }

        // Refresh stats
        await fetchEngagementStats(postId, type);
      } catch (error) {
        console.error(`Failed to toggle like for ${type} ${postId}:`, error);
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
    async (postId: number, type: 'post' | 'group-post' = 'post') => {
      try {
        setDislikeLoading((prev) => new Map(prev).set(postId, true));
        const engagement = engagements.get(postId);

        if (engagement?.dislikes.user_disliked) {
          await engagementService.removeDislikePost(postId, type);
        } else {
          await engagementService.dislikePost(postId, type);
        }

        // Refresh stats
        await fetchEngagementStats(postId, type);
      } catch (error) {
        console.error(`Failed to toggle dislike for ${type} ${postId}:`, error);
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
    async (postId: number, platform: string = 'direct') => {
      try {
        setShareLoading((prev) => new Map(prev).set(postId, true));
        await engagementService.sharePost(postId, platform);

        // Refresh stats
        await fetchEngagementStats(postId, 'post');
      } catch (error) {
        console.error(`Failed to share post ${postId}:`, error);
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

  // Fetch comments - defined before addComment
  const fetchComments = useCallback(async (postId: number, page: number = 1) => {
    try {
      setCommentLoading((prev) => new Map(prev).set(postId, true));
      const response = await engagementService.getPostComments(postId, page);

      setComments((prev) => {
        const updated = new Map(prev);
        updated.set(postId, response.data || []);
        return updated;
      });

      return response;
    } catch (error) {
      console.error(`Failed to fetch comments for post ${postId}:`, error);
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
    async (postId: number, content: string, parentId?: number, image?: File, postOwnerId?: number) => {
      console.log('[Socket.IO Debug] addComment called', {
        timestamp: new Date().toISOString(),
        postId,
        postOwnerId,
        parentId,
        hasContent: !!content?.trim(),
        hasImage: !!image,
        isCommentingOnOwnerPost: postOwnerId ? 'checking...' : 'unknown',
        socketConnected,
      });
      try {
        setCommentLoading((prev) => new Map(prev).set(postId, true));
        await engagementService.createComment(postId, content, parentId, 'post', image, postOwnerId);

        // Refresh comments
        await fetchComments(postId);
        console.log('[Socket.IO Debug] Comments refreshed after adding', {
          timestamp: new Date().toISOString(),
          postId,
        });
      } catch (error) {
        console.error(`Failed to add comment to post ${postId}:`, error);
        throw error;
      } finally {
        setCommentLoading((prev) => {
          const updated = new Map(prev);
          updated.delete(postId);
          return updated;
        });
      }
    },
    [fetchComments, socketConnected]
  );

  // Update comment
  const updateComment = useCallback(async (commentId: number, content: string) => {
    try {
      await engagementService.updateComment(commentId, content);
    } catch (error) {
      console.error(`Failed to update comment ${commentId}:`, error);
      throw error;
    }
  }, []);

  // Delete comment
  const deleteComment = useCallback(
    async (postId: number, commentId: number) => {
      try {
        await engagementService.deleteComment(commentId);

        // Update comments
        setComments((prev) => {
          const updated = new Map(prev);
          const postComments = updated.get(postId) || [];
          updated.set(postId, postComments.filter((c) => c.id !== commentId));
          return updated;
        });
      } catch (error) {
        console.error(`Failed to delete comment ${commentId}:`, error);
        throw error;
      }
    },
    []
  );

  // Fetch likes
  const fetchLikes = useCallback(async (postId: number, page: number = 1) => {
    try {
      return await engagementService.getPostLikes(postId, page);
    } catch (error) {
      console.error(`Failed to fetch likes for post ${postId}:`, error);
    }
  }, []);

  // Fetch shares
  const fetchShares = useCallback(async (postId: number, page: number = 1) => {
    try {
      return await engagementService.getPostShares(postId, page);
    } catch (error) {
      console.error(`Failed to fetch shares for post ${postId}:`, error);
    }
  }, []);

  const value: EngagementContextType = {
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
    updateComment,
    deleteComment,
    fetchEngagementStats,
    fetchComments,
    fetchLikes,
    fetchShares,
    socketConnected,
    socketError,
  };

  return (
    <EngagementContext.Provider value={value}>
      {children}
    </EngagementContext.Provider>
  );
}

export function useEngagement() {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error('useEngagement must be used within EngagementProvider');
  }
  return context;
}
