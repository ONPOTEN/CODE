import { API_BASE_URL, tokenStorage } from './api';

export interface Notification {
  id: number;
  userid: number;
  ownid: number;
  type: 'comment' | 'like' | 'message' | 'follow' | 'mention' | 'share';
  posttype: string;
  postid: number;
  content: string;
  status: number; // 0 = unread, 1 = read
  created_at: string;
  sender?: {
    id: number;
    name: string;
    avatar?: string;
  };
}

export interface NotificationResponse {
  data: Notification[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface NotificationCountResponse {
  count: number;
}

/**
 * Get unread notification count
 */
export async function getNotificationCount(): Promise<number> {
  const token = tokenStorage.get();
  if (!token) return 0;

  try {
    const response = await fetch(`${API_BASE_URL}/notifications/count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return 0;
    }

    const data: NotificationCountResponse = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Failed to fetch notification count:', error);
    return 0;
  }
}

/**
 * Get all notifications with pagination
 */
export async function getNotifications(page: number = 1, perPage: number = 20): Promise<NotificationResponse> {
  const token = tokenStorage.get();
  if (!token) {
    return { data: [], pagination: { total: 0, per_page: 20, current_page: 1, last_page: 1 } };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/notifications?page=${page}&per_page=${perPage}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { data: [], pagination: { total: 0, per_page: 20, current_page: 1, last_page: 1 } };
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return { data: [], pagination: { total: 0, per_page: 20, current_page: 1, last_page: 1 } };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  const token = tokenStorage.get();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/mark-read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const token = tokenStorage.get();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return false;
  }
}

/**
 * Format notification message based on type (Vietnamese)
 */
export function formatNotificationMessage(notification: Notification, senderName?: string): string {
  const sender = senderName || 'Người dùng';

  switch (notification.type) {
    case 'comment':
      if (notification.posttype === 'grouppost') return `${sender} đã bình luận về bài viết nhóm của bạn`;
      if (notification.posttype === 'post') return `${sender} đã bình luận về bài viết của bạn`;
      if (notification.posttype === 'shoppost') return `${sender} đã bình luận về bài viết cửa hàng của bạn`;
      return `${sender} đã bình luận về bài viết của bạn`;
    case 'like':
      if (notification.posttype === 'grouppost') return `${sender} đã thích bài viết nhóm của bạn`;
      if (notification.posttype === 'post') return `${sender} đã thích bài viết của bạn`;
      if (notification.posttype === 'shoppost') return `${sender} đã thích bài viết cửa hàng của bạn`;
      return `${sender} đã thích bài viết của bạn`;
    case 'message':
      return `${sender} đã gửi tin nhắn cho bạn`;
    case 'follow':
      return `${sender} đã bắt đầu theo dõi bạn`;
    case 'mention':
      return `${sender} đã nhắc đến bạn trong một bài viết`;
    case 'share':
      return `${sender} đã chia sẻ bài viết của bạn`;
    default:
      return `Bạn có một thông báo mới`;
  }
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'comment':
      return '💬';
    case 'like':
      return '❤️';
    case 'message':
      return '✉️';
    case 'follow':
      return '👤';
    case 'mention':
      return '@';
    case 'share':
      return '🔄';
    default:
      return '🔔';
  }
}

/**
 * Get notification URL based on type
 */
export function getNotificationUrl(notification: Notification): string {
  switch (notification.type) {
    case 'comment':
    case 'like':
    case 'share':
      if (notification.posttype === 'post') {
        return `/posts/${notification.postid}`;
      } else if (notification.posttype === 'wall_post') {
        return `/users/${notification.ownid}/wall`;
      } else if (notification.posttype === 'shop_post') {
        return `/shops/${notification.postid}`;
      }
      return `/posts/${notification.postid}`;
    case 'message':
      return `/messages`;
    case 'follow':
      return `/users/${notification.userid}`;
    default:
      return '/notifications';
  }
}

/**
 * Format notification time relative to now
 */
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
