/**
 * Group Engagement Service - Group-specific engagement features (likes, dislikes, shares, comments)
 * Handles GroupPost engagement with proper API endpoints
 */

export interface GroupEngagement {
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

export interface GroupComment {
  id: number;
  post_id: number;
  comment_content: string;
  image?: string;
  user_id: number;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  parent_id?: number;
  author?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  author_name: string;
  created_at: string;
  updated_at: string;
}

class GroupEngagementService {
  private apiBaseUrl: string;
  private token: string = '';

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.centimet2.com/api/v1';
  }

  setToken(token: string): void {
    this.token = token;
  }

  async likeGroupPost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engage/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to like group post');
    }
    return await response.json();
  }

  async unlikeGroupPost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engage/like`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unlike group post');
    }
    return await response.json();
  }

  async dislikeGroupPost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engage/dislike`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to dislike group post');
    }
    return await response.json();
  }

  async removeDislikeGroupPost(postId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engage/dislike`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove dislike from group post');
    }
    return await response.json();
  }

  async shareGroupPost(postId: number, sharedVia: string = 'direct'): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engage/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shared_via: sharedVia }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to share group post');
    }
    return await response.json();
  }

  async getGroupPostEngagementStats(postId: number): Promise<GroupEngagement> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engage/stats`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch engagement stats');
    }
    return await response.json();
  }

  async getGroupPostComments(postId: number, page: number = 1, perPage: number = 10000): Promise<{ data: GroupComment[] }> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/comments?page=${page}&per_page=${perPage}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    return await response.json();
  }

  async addGroupPostComment(postId: number, content: string, parentId?: number, image?: File): Promise<any> {
    console.log('[Socket.IO Debug] GroupEngagementService: addGroupPostComment called', {
      timestamp: new Date().toISOString(),
      postId,
      parentId,
      hasContent: !!content?.trim(),
      hasImage: !!image,
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 50),
    });

    let response: Response;

    if (image) {
      // Use FormData for image upload via Next.js API proxy
      const formData = new FormData();
      formData.append('comment_content', content || '');
      if (parentId) {
        formData.append('parent_id', parentId.toString());
      }
      formData.append('image', image);

      // Use the Next.js API proxy for file uploads
      const proxyUrl = `/api/proxy/group-posts/${postId}/comments`;

      response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
      });
    } else {
      // Use JSON for text-only comments
      response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment_content: content,
          parent_id: parentId || null,
        }),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('[Socket.IO Debug] GroupEngagementService: addGroupPostComment failed', {
        timestamp: new Date().toISOString(),
        postId,
        error: error.message || response.statusText,
        status: response.status,
      });
      throw new Error(error.message || 'Failed to add comment');
    }

    const result = await response.json();
    console.log('[Socket.IO Debug] GroupEngagementService: addGroupPostComment success', {
      timestamp: new Date().toISOString(),
      postId,
      commentId: result.data?.id || result.id,
    });
    return result;
  }

  async updateGroupPostComment(postId: number, commentId: number, content: string): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment_content: content }),
    });
    if (!response.ok) {
      throw new Error('Failed to update comment');
    }
    return await response.json();
  }

  async deleteGroupPostComment(postId: number, commentId: number): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }
    return await response.json();
  }

  async getGroupPostLikes(postId: number, page: number = 1): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engage/likes?page=${page}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch likes');
    }
    return await response.json();
  }

  async getGroupPostShares(postId: number, page: number = 1): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/group-posts/${postId}/engage/shares?page=${page}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch shares');
    }
    return await response.json();
  }
}

const groupEngagementService = new GroupEngagementService();
export default groupEngagementService;
