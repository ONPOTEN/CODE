/**
 * Group Engagement Service - Real-time engagement features for group posts (likes, dislikes, comments)
 * Integrated with Socket.io for real-time updates and Laravel backend
 */

import { io, Socket } from 'socket.io-client';

export interface GroupEngagement {
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
}

export interface GroupComment {
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
  user_id: number;
}

class GroupEngagementService {
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
   * Like a group post
   */
  async likeGroupPost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to like group post: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Unlike a group post
   */
  async unlikeGroupPost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/like`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to unlike group post: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Dislike a group post
   */
  async dislikeGroupPost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/dislike`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to dislike group post: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Remove dislike from a group post
   */
  async removeDislikeGroupPost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/dislike`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to remove dislike from group post: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get engagement stats for a group post
   */
  async getGroupPostEngagementStats(postId: number): Promise<GroupEngagement> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engagement`, {
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch group post engagement stats: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all comments for a group post
   */
  async getGroupPostComments(postId: number, page: number = 1, perPage: number = 15): Promise<any> {
    const response = await fetch(
      `${this.apiBaseUrl}/group-posts/${postId}/comments?page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': this.token ? `Bearer ${this.token}` : '',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch group post comments: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Add a comment to a group post
   */
  async addGroupPostComment(postId: number, content: string, parentId?: number): Promise<any> {
    const body: any = { content };
    if (parentId) {
      body.parent_id = parentId;
    }

    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update a comment on a group post
   */
  async updateGroupPostComment(commentId: number, content: string): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-comments/${commentId}`, {
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
   * Delete a comment from a group post
   */
  async deleteGroupPostComment(commentId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-comments/${commentId}`, {
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
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
}

export default new GroupEngagementService();
