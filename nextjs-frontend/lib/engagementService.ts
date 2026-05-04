/**
 * Engagement Service - Real-time engagement features (likes, dislikes, shares, comments)
 * Integrated with Socket.io for real-time updates and Laravel backend
 */

import { io, Socket } from 'socket.io-client';

export interface Engagement {
  likes: {
    count: number;
    user_liked: boolean;
  };
  dislikes: {
    count: number;
    user_disliked: boolean;
  };
  comments: {
    count: number;
  };
  shares: {
    count: number;
  };
}

export interface Comment {
  id: number;
  post_id: number;
  content: string;
  image?: string;
  author: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  author_name: string;
  author_email: string;
  created_at: string;
  updated_at: string;
  approved: boolean;
  parent_id: number;
  user_id: number;
}

export interface Share {
  id: number;
  post_id: number;
  user_id: number;
  shared_via: 'direct' | 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'email';
  created_at: string;
}

class EngagementService {
  private socket: Socket | null = null;
  private apiBaseUrl: string;
  private token: string | null = null;
  private userId: number | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(apiBaseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'https://api.centimet2.com/api/v1') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Set the authentication token for API requests
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Set the user ID for socket registration
   */
  setUserId(userId: number): void {
    this.userId = userId;
    console.log('[EngagementService] User ID set:', userId);
    // If already connected, register immediately
    if (this.socket?.connected) {
      this.registerUser();
    }
  }

  /**
   * Register the current user with the Socket.IO server
   * This is required for the server to know which socket belongs to which user
   */
  private registerUser(): void {
    if (this.socket && this.userId) {
      console.log('[Socket.IO Debug] Registering user with socket server:', {
        userId: this.userId,
        socketId: this.socket.id,
        timestamp: new Date().toISOString(),
      });
      this.socket.emit('chat:register', { userId: this.userId });
    }
  }

  /**
   * Initialize Socket.io connection for real-time engagement updates
   */
  initializeSocket(token: string, userId: number, socketUrl: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.token = token;
        this.userId = userId;
        console.log('[EngagementService] Initializing socket with URL:', socketUrl);
        console.log('[EngagementService] User ID for registration:', userId);

        const socketOptions = {
          auth: {
            token: token,
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling'],
        };

        this.socket = io(socketUrl, socketOptions);

        this.socket.on('connect', () => {
          console.log('[EngagementService] Socket connected successfully:', this.socket?.id);

          // CRITICAL: Register user ID with the server
          // This allows the server to send notifications to specific users
          this.registerUser();

          this.emit('connected', { connected: true });
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('[EngagementService] Socket disconnected');
          this.emit('disconnected', { connected: false });
        });

        this.socket.on('connect_error', (error) => {
          console.error('[EngagementService] Socket connection error:', error);
          this.emit('connection-error', { error: error.message });
        });

        this.socket.on('error', (error) => {
          console.error('[EngagementService] Socket error:', error);
          this.emit('error', { error });
        });

        this.socket.on('engagement:like-added', (data) => {
          console.log('[Socket.IO Debug] Received engagement:like-added', {
            timestamp: new Date().toISOString(),
            data,
          });
          this.emit('like-added', data);
        });

        this.socket.on('engagement:like-removed', (data) => {
          console.log('[Socket.IO Debug] Received engagement:like-removed', {
            timestamp: new Date().toISOString(),
            data,
          });
          this.emit('like-removed', data);
        });

        this.socket.on('engagement:dislike-added', (data) => {
          console.log('[Socket.IO Debug] Received engagement:dislike-added', {
            timestamp: new Date().toISOString(),
            data,
          });
          this.emit('dislike-added', data);
        });

        this.socket.on('engagement:dislike-removed', (data) => {
          console.log('[Socket.IO Debug] Received engagement:dislike-removed', {
            timestamp: new Date().toISOString(),
            data,
          });
          this.emit('dislike-removed', data);
        });

        this.socket.on('engagement:comment-added', (data) => {
          console.log('[Socket.IO Debug] Received engagement:comment-added', {
            timestamp: new Date().toISOString(),
            data,
            postId: data.post_id,
            commentId: data.comment?.id,
            commentAuthor: data.comment?.author?.name || data.comment?.author_name,
          });
          this.emit('comment-added', data);
        });

        this.socket.on('engagement:comment-updated', (data) => {
          console.log('[Socket.IO Debug] Received engagement:comment-updated', {
            timestamp: new Date().toISOString(),
            data,
          });
          this.emit('comment-updated', data);
        });

        this.socket.on('engagement:comment-removed', (data) => {
          console.log('[Socket.IO Debug] Received engagement:comment-removed', {
            timestamp: new Date().toISOString(),
            data,
          });
          this.emit('comment-removed', data);
        });

        this.socket.on('engagement:share-added', (data) => {
          console.log('[Socket.IO Debug] Received engagement:share-added', {
            timestamp: new Date().toISOString(),
            data,
          });
          this.emit('share-added', data);
        });

        this.socket.on('error', (error) => {
          console.error('Engagement socket error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect Socket.io connection
   */
  disconnect(): void {
    console.log('[Socket.IO Debug] Disconnecting socket:', {
      userId: this.userId,
      socketId: this.socket?.id,
      wasConnected: this.socket?.connected,
      timestamp: new Date().toISOString(),
    });
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
    this.userId = null;
  }

  /**
   * Register event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Like a post
   */
  async likePost(postId: number, type: 'post' | 'group-post' = 'post'): Promise<any> {
    const endpoint = type === 'group-post' ? 'group-posts' : 'posts';
    const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${postId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to like ${type}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: number, type: 'post' | 'group-post' = 'post'): Promise<any> {
    const endpoint = type === 'group-post' ? 'group-posts' : 'posts';
    const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${postId}/like`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to unlike ${type}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Dislike a post
   */
  async dislikePost(postId: number, type: 'post' | 'group-post' = 'post'): Promise<any> {
    const endpoint = type === 'group-post' ? 'group-posts' : 'posts';
    const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${postId}/dislike`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to dislike ${type}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Remove dislike from a post
   */
  async removeDislikePost(postId: number, type: 'post' | 'group-post' = 'post'): Promise<any> {
    const endpoint = type === 'group-post' ? 'group-posts' : 'posts';
    const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${postId}/dislike`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to remove dislike from ${type}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Share a post
   */
  async sharePost(postId: number, sharedVia: string = 'direct'): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/posts/${postId}/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shared_via: sharedVia }),
    });

    if (!response.ok) {
      throw new Error(`Failed to share post: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get engagement stats for a post
   */
  async getEngagementStats(postId: number, type: 'post' | 'group-post' = 'post'): Promise<Engagement> {
    const endpoint = type === 'group-post' ? 'group-posts' : 'posts';
    const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${postId}/engagement`, {
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch engagement stats for ${type}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all comments for a post
   */
  async getPostComments(postId: number, page: number = 1, perPage: number = 10000): Promise<any> {
    const response = await fetch(
      `${this.apiBaseUrl}/posts/${postId}/comments?page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': this.token ? `Bearer ${this.token}` : '',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create a comment on a post (WpPost or GroupPost)
   * @param postId - The post ID
   * @param content - The comment content
   * @param parentId - Optional parent comment ID for nested replies
   * @param type - 'post' for WpPost or 'group-post' for GroupPost (default: 'post')
   * @param image - Optional image file to attach
   * @param postOwnerId - Optional post owner ID for debug logging when commenter is not owner
   */
  async createComment(postId: number, content: string, parentId?: number, type: 'post' | 'group-post' = 'post', image?: File, postOwnerId?: number): Promise<any> {
    const endpoint = type === 'group-post' ? `group-posts` : `posts`;
    const fieldName = type === 'group-post' ? 'comment_content' : 'content';

    // Debug: Log comment creation attempt
    console.log('[Socket.IO Debug] Comment creation started', {
      timestamp: new Date().toISOString(),
      postId,
      type,
      parentId,
      hasContent: !!content?.trim(),
      hasImage: !!image,
      postOwnerId,
      isCommentingOnOwnerPost: postOwnerId ? 'will determine after fetch' : 'unknown',
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 50) || '',
    });

    let response: Response;

    if (image) {
      // Use FormData for image upload - route through Next.js API proxy
      const formData = new FormData();
      formData.append(fieldName, content || '');
      if (parentId) {
        formData.append('parent_id', parentId.toString());
      }
      formData.append('image', image);

      // Use the Next.js API proxy for file uploads
      const proxyUrl = `/api/proxy/${endpoint}/${postId}/comments`;

      response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
      });
    } else {
      // Use JSON for text-only comments
      response = await fetch(`${this.apiBaseUrl}/${endpoint}/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [fieldName]: content,
          parent_id: parentId || null,
        }),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('[Socket.IO Debug] Comment creation failed', {
        timestamp: new Date().toISOString(),
        postId,
        type,
        error: error.message || response.statusText,
        status: response.status,
      });
      throw new Error(error.message || `Failed to create comment: ${response.statusText}`);
    }

    const result = await response.json();

    // Debug: Log successful comment creation
    const commentData = result.data || result.comment || result;
    console.log('[Socket.IO Debug] Comment created successfully', {
      timestamp: new Date().toISOString(),
      postId,
      type,
      commentId: commentData?.id,
      commentAuthorId: commentData?.author?.id || commentData?.user_id,
      postOwnerId,
      isOwnerCommenting: postOwnerId && (commentData?.author?.id === postOwnerId || commentData?.user_id === postOwnerId),
      isUserCommentingOnOwnerPost: postOwnerId && (commentData?.author?.id !== postOwnerId && commentData?.user_id !== postOwnerId),
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
    });

    // If user is commenting on owner's post (not their own), add extra debug log
    if (postOwnerId && commentData?.author?.id !== postOwnerId && commentData?.user_id !== postOwnerId) {
      console.warn('[Socket.IO Debug] USER COMMENTING ON OWNER POST', {
        timestamp: new Date().toISOString(),
        postId,
        postOwnerId,
        commenterId: commentData?.author?.id || commentData?.user_id,
        commenterName: commentData?.author?.name || commentData?.author_name,
        commentContent: content?.substring(0, 100),
        parentId,
        socketConnected: this.socket?.connected,
        socketId: this.socket?.id,
        fullComment: commentData,
      });
    }

    return result;
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: number, content: string): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update comment: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete comment: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all likes for a post
   */
  async getPostLikes(postId: number, page: number = 1, perPage: number = 15): Promise<any> {
    const response = await fetch(
      `${this.apiBaseUrl}/posts/${postId}/likes?page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': this.token ? `Bearer ${this.token}` : '',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch likes: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all shares for a post
   */
  async getPostShares(postId: number, page: number = 1, perPage: number = 15): Promise<any> {
    const response = await fetch(
      `${this.apiBaseUrl}/posts/${postId}/shares?page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': this.token ? `Bearer ${this.token}` : '',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch shares: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket ? this.socket.connected : false;
  }
}

// Export singleton instance
export default new EngagementService();
