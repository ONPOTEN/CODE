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
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(apiBaseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Set the authentication token for API requests
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Initialize Socket.io connection for real-time engagement updates
   */
  initializeSocket(token: string, socketUrl: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.token = token;
        console.log('[EngagementService] Initializing socket with URL:', socketUrl);

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
          this.emit('like-added', data);
        });

        this.socket.on('engagement:like-removed', (data) => {
          this.emit('like-removed', data);
        });

        this.socket.on('engagement:dislike-added', (data) => {
          this.emit('dislike-added', data);
        });

        this.socket.on('engagement:dislike-removed', (data) => {
          this.emit('dislike-removed', data);
        });

        this.socket.on('engagement:comment-added', (data) => {
          this.emit('comment-added', data);
        });

        this.socket.on('engagement:comment-updated', (data) => {
          this.emit('comment-updated', data);
        });

        this.socket.on('engagement:comment-removed', (data) => {
          this.emit('comment-removed', data);
        });

        this.socket.on('engagement:share-added', (data) => {
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
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
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
  async getPostComments(postId: number, page: number = 1, perPage: number = 15): Promise<any> {
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
   * Create a comment on a post
   */
  async createComment(postId: number, content: string, parentId?: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        parent_id: parentId || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create comment: ${response.statusText}`);
    }

    return await response.json();
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
