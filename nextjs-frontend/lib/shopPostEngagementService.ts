/**
 * Shop Post Engagement Service - Shop-specific engagement features (likes, dislikes, shares, comments)
 * Handles ShopPost engagement with proper API endpoints
 */

export interface ShopPostEngagement {
  post_id: number;
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

export interface ShopPostComment {
  id: number;
  post_id: number;
  content: string;
  user_id: number;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  parent_id?: number;
  author?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  created_at: string;
  updated_at: string;
  replies?: ShopPostComment[];
}

class ShopPostEngagementService {
  private apiBaseUrl: string;
  private token: string = '';

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';
  }

  setToken(token: string): void {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async getEngagementStats(postId: number): Promise<ShopPostEngagement> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/engagement`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch engagement stats');
    }
    const json = await response.json();

    // Transform backend response to expected format
    const data = json.data || json;
    return {
      post_id: postId,
      likes: {
        count: data.likes_count || 0,
        user_liked: data.user_has_liked || false,
      },
      dislikes: {
        count: data.dislikes_count || 0,
        user_disliked: data.user_has_disliked || false,
      },
      comments: {
        count: data.comments_count || 0,
      },
      shares: {
        count: data.shares_count || 0,
      },
    };
  }

  async likePost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/like`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to like post');
    }
    return await response.json();
  }

  async unlikePost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/like`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unlike post');
    }
    return await response.json();
  }

  async dislikePost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/dislike`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to dislike post');
    }
    return await response.json();
  }

  async removeDislike(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/dislike`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove dislike');
    }
    return await response.json();
  }

  async sharePost(postId: number, platform: string = 'direct'): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ platform }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to share post');
    }
    return await response.json();
  }

  async getComments(postId: number, page: number = 1, perPage: number = 50): Promise<{ data: ShopPostComment[], pagination: any }> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/comments?page=${page}&per_page=${perPage}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    const json = await response.json();

    // Transform backend response - map 'user' to 'author' for consistency
    const comments = (json.data || []).map((comment: any) => ({
      ...comment,
      author: comment.user ? {
        id: comment.user.ID || comment.user.id,
        name: comment.user.display_name || comment.user.user_login || 'User',
        email: comment.user.user_email || '',
        avatar: comment.user.avatar,
      } : null,
    }));

    return {
      data: comments,
      pagination: json.meta || { current_page: 1, last_page: 1, per_page: perPage, total: comments.length },
    };
  }

  async addComment(postId: number, content: string, parentId?: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/comments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        content,
        parent_id: parentId || null,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add comment');
    }
    return await response.json();
  }

  async deleteComment(postId: number, commentId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/shop-posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete comment');
    }
    return await response.json();
  }
}

const shopPostEngagementService = new ShopPostEngagementService();
export default shopPostEngagementService;
