const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';

// Token storage utilities
const TOKEN_KEY = 'api_token';

// Phone number utilities
/**
 * Encode phone number for URL-safe transmission
 * Handles international format with '+' prefix
 * Example: "+840867631313" → "%2B840867631313"
 */
export const encodePhoneNumber = (phone: string): string => {
  return encodeURIComponent(phone.trim());
};

/**
 * Normalize phone number to standard format
 * Ensures '+' prefix for international numbers
 * Example: "840867631313" → "+840867631313"
 */
export const normalizePhoneNumber = (phone: string): string => {
  let normalized = phone.trim();
  // Remove all non-digit characters except '+'
  normalized = normalized.replace(/[^\d+]/g, '');
  // Add '+' prefix if not present and looks like international number (10+ digits)
  if (!normalized.startsWith('+') && /^\d{10,}$/.test(normalized)) {
    normalized = '+' + normalized;
  }
  return normalized;
};

/**
 * Get user by phone number - handles special encoding for '+' character
 * Uses query parameter to avoid URL path encoding issues
 */
export const getUserByPhone = async (phoneNumber: string): Promise<any> => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Build URL with proper concatenation (not URL constructor which treats /path as domain-root absolute)
  const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const encodedPhone = encodeURIComponent(normalizedPhone);
  const fullUrl = `${basePath}/users/by-phone?phone=${encodedPhone}`;

  console.log(`[API] Looking up user by phone: ${normalizedPhone}`);
  console.log(`[API] Full URL: ${fullUrl}`);

  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl, { headers });
  return handleResponse<any>(response);
};

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiException extends Error {
  public status: number;
  public errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.errors = errors;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let error: ApiError;
    try {
      error = await response.json();
    } catch {
      error = {
        message: response.statusText || `HTTP Error ${response.status}`,
      };
    }

    const errorMessage = error.message || response.statusText || `An error occurred (${response.status})`;

    throw new ApiException(
      errorMessage,
      response.status,
      error.errors
    );
  }

  return response.json();
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Handle URL construction safely
  // Build the full URL by combining base URL and endpoint
  // Support both endpoints with query strings (e.g., '/posts?page=1') and without
  //
  // IMPORTANT: The URL constructor treats absolute paths (starting with /) as
  // domain-root absolute, not as path appends. So we must concatenate strings instead.

  let fullUrl: string;

  if (endpoint.includes('?')) {
    // Split endpoint and query string
    const [path, queryString] = endpoint.split('?', 2);
    // Concatenate base URL with path (handle leading/trailing slashes)
    const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const endpointPath = path.startsWith('/') ? path : '/' + path;
    fullUrl = basePath + endpointPath + '?' + queryString;
  } else {
    // No query string, simple concatenation
    const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const endpointPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    fullUrl = basePath + endpointPath;
  }

  console.log(`[apiRequest] Full URL: ${fullUrl}`);

  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  const response = await fetch(fullUrl, config);
  return handleResponse<T>(response);
}

// API request with file upload support
export async function apiRequestWithFiles<T = any>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  // Use same URL construction logic as apiRequest
  const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const endpointPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const url = basePath + endpointPath;

  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData - browser will set it with boundary
  const config: RequestInit = {
    method: 'POST',
    headers,
    body: formData,
  };

  const response = await fetch(url, config);
  return handleResponse<T>(response);
}

// Auth API
export interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    display_name: string;
  };
  token: string;
  message: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  display_name?: string;
  phone?: string;
  role?: string;
}

export const auth = {
  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store the token
    if (response.token) {
      tokenStorage.set(response.token);
    }

    return response;
  },

  login: async (username: string, password: string): Promise<LoginResponse> => {
    // username can be email, phone, or actual username
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // Store the token
    if (response.token) {
      tokenStorage.set(response.token);
    }

    return response;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    });

    // Remove the token
    tokenStorage.remove();

    return response;
  },

  getToken: () => tokenStorage.get(),

  isAuthenticated: () => !!tokenStorage.get(),
};

// Pagination wrapper
export interface PaginatedResponse<T> {
  data: T[];
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}

// Posts API
export interface PostImage {
  id: number;
  url: string;
  path: string;
  order: number;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  type: string;
  status: string;
  visibility?: string;
  featured_image?: string;
  images?: PostImage[];
  created_at: string;
  updated_at: string;
}

export interface CreatePostData {
  title: string;
  content: string;
  excerpt?: string;
  type?: 'post' | 'page' | 'product';
  status?: 'publish' | 'draft' | 'pending';
  images?: File[];
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  excerpt?: string;
  type?: 'post' | 'page' | 'product';
  status?: 'publish' | 'draft' | 'pending';
  visibility?: 'public' | 'private';
  images?: File[];
  remove_images?: number[];
}

export interface CreatePostResponse {
  message: string;
  post: Post;
}

export const posts = {
  getAll: async (params?: { per_page?: number; page?: number; sort?: string; order?: 'asc' | 'desc' }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.sort) searchParams.append('sort', params.sort);
    if (params?.order) searchParams.append('order', params.order);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Post>>(`/posts${query}`);
  },

  getById: async (id: number) => {
    return apiRequest<Post>(`/posts/${id}`);
  },

  getBySlug: async (slug: string) => {
    return apiRequest<Post>(`/posts/slug/${slug}`);
  },

  getByType: async (type: string, params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Post>>(`/posts/type/${type}${query}`);
  },

  create: async (data: CreatePostData): Promise<CreatePostResponse> => {
    // If there are images, use FormData
    if (data.images && data.images.length > 0) {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      if (data.excerpt) formData.append('excerpt', data.excerpt);
      if (data.type) formData.append('type', data.type);
      if (data.status) formData.append('status', data.status);

      // Append images
      data.images.forEach((image) => {
        formData.append('images[]', image);
      });

      return apiRequestWithFiles<CreatePostResponse>('/posts', formData);
    }

    // Otherwise use JSON
    return apiRequest<CreatePostResponse>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: UpdatePostData): Promise<CreatePostResponse> => {
    // If there are images or remove_images, use FormData
    if ((data.images && data.images.length > 0) || (data.remove_images && data.remove_images.length > 0)) {
      const formData = new FormData();
      if (data.title) formData.append('title', data.title);
      if (data.content) formData.append('content', data.content);
      if (data.excerpt) formData.append('excerpt', data.excerpt);
      if (data.type) formData.append('type', data.type);
      if (data.status) formData.append('status', data.status);

      // Append new images
      if (data.images) {
        data.images.forEach((image) => {
          formData.append('images[]', image);
        });
      }

      // Append images to remove
      if (data.remove_images) {
        data.remove_images.forEach((index) => {
          formData.append('remove_images[]', index.toString());
        });
      }

      return apiRequestWithFiles<CreatePostResponse>(`/posts/${id}`, formData);
    }

    // Otherwise use JSON
    return apiRequest<CreatePostResponse>(`/posts/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  myPosts: async (params?: { per_page?: number; page?: number; status?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Post>>(`/my-posts${query}`);
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/posts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Users API
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  hobby?: string;
  company?: string;
  location?: string;
  role?: string;
  avatar?: string;
  avatar_url?: string;
  profile_visibility?: string;
  phone?: string;
  email_public?: boolean;
  hobby_public?: boolean;
  company_public?: boolean;
  location_public?: boolean;
  phone_public?: boolean;
  created_at: string;
  updated_at: string;
  friendship_status?: 'none' | 'pending' | 'accepted' | 'blocked';
  is_friend?: boolean;
  friend_request_sent?: boolean;
  friend_request_received?: boolean;
}

export interface FriendRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  sender?: User;
  receiver?: User;
}

export const users = {
  getAll: async (params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<User>>(`/users${query}`);
  },

  getById: async (id: number) => {
    return apiRequest<User>(`/users/${id}`);
  },

  getByUsername: async (username: string) => {
    return apiRequest<User>(`/users/username/${username}`);
  },

  search: async (query: string): Promise<{ data: User[] }> => {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    return apiRequest(`/users/search?${searchParams}`);
  },

  updateProfile: async (data: { display_name?: string; user_email?: string; hobby?: string; company?: string; location?: string; role?: string; profile_visibility?: string; phone?: string; email_public?: boolean; hobby_public?: boolean; company_public?: boolean; location_public?: boolean; phone_public?: boolean }): Promise<User> => {
    return apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updatePassword: async (data: { current_password: string; new_password: string; new_password_confirmation: string }): Promise<{ message: string }> => {
    return apiRequest('/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar: async (file: File): Promise<{ message: string; avatar: string; avatar_url: string }> => {
    return apiRequestWithFiles('/profile/avatar', (() => {
      const formData = new FormData();
      formData.append('avatar', file);
      return formData;
    })());
  },
};

// Shop interfaces
export interface Shop {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'active' | 'inactive' | 'pending';
  owner?: User;
  created_at: string;
  updated_at: string;
}

export interface CreateShopData {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
}

// Shops API
export const shops = {
  getAll: async (params?: { per_page?: number; page?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Shop>>(`/shops${query}`);
  },

  getById: async (id: number) => {
    return apiRequest<Shop>(`/shops/${id}`);
  },

  myShops: async (params?: { per_page?: number; page?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Shop>>(`/my-shops${query}`);
  },

  create: async (data: CreateShopData): Promise<{ message: string; shop: Shop }> => {
    return apiRequest('/shops', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<CreateShopData>): Promise<{ message: string; shop: Shop }> => {
    return apiRequest(`/shops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/shops/${id}`, {
      method: 'DELETE',
    });
  },

  // Admin endpoints
  getPendingShops: async (params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Shop>>(`/admin/shops/pending${query}`);
  },

  approve: async (id: number): Promise<{ message: string; shop: Shop }> => {
    return apiRequest(`/admin/shops/${id}/approve`, {
      method: 'POST',
    });
  },

  reject: async (id: number): Promise<{ message: string; shop: Shop }> => {
    return apiRequest(`/admin/shops/${id}/reject`, {
      method: 'POST',
    });
  },
};

// Shop Posts interfaces
export interface ShopPost {
  id: number;
  shop_id: number;
  user_id: number;
  title: string;
  slug: string;
  content?: string;
  price_range?: string;
  type: 'post' | 'page';
  status: 'draft' | 'published';
  featured_image?: string; // Legacy field for backward compatibility
  featured_images?: string[]; // New field for multiple images
  view_count: number;
  created_at: string;
  updated_at: string;
  shop?: Shop;
  author?: User;
}

export interface CreateShopPostData {
  title: string;
  content?: string;
  type: 'post' | 'page';
  status: 'draft' | 'published';
  featured_image?: string;
}

// Shop Posts API
export const shopPosts = {
  getAll: async (shopId: number, params?: { per_page?: number; page?: number; type?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.type) searchParams.append('type', params.type);
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<ShopPost>>(`/shops/${shopId}/posts${query}`);
  },

  getById: async (shopId: number, id: number) => {
    return apiRequest<ShopPost>(`/shops/${shopId}/posts/${id}`);
  },

  create: async (shopId: number, data: CreateShopPostData): Promise<{ message: string; post: ShopPost }> => {
    return apiRequest(`/shops/${shopId}/posts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (shopId: number, id: number, data: Partial<CreateShopPostData>): Promise<{ message: string; post: ShopPost }> => {
    return apiRequest(`/shops/${shopId}/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (shopId: number, id: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/shops/${shopId}/posts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Friends API
export const friends = {
  sendRequest: async (userId: number): Promise<{ message: string; friend_request: FriendRequest }> => {
    return apiRequest(`/friends/request/${userId}`, {
      method: 'POST',
    });
  },

  acceptRequest: async (userId: number): Promise<{ message: string }> => {
    return apiRequest(`/friends/accept/${userId}`, {
      method: 'POST',
    });
  },

  rejectRequest: async (userId: number): Promise<{ message: string }> => {
    return apiRequest(`/friends/reject/${userId}`, {
      method: 'POST',
    });
  },

  unfriend: async (userId: number): Promise<{ message: string }> => {
    return apiRequest(`/friends/unfriend/${userId}`, {
      method: 'DELETE',
    });
  },

  getAll: async (): Promise<{ data: User[] }> => {
    return apiRequest('/friends');
  },

  getPendingRequests: async (): Promise<{ data: FriendRequest[] }> => {
    return apiRequest('/friends/pending');
  },

  getStatus: async (userId: number): Promise<{ status: string; is_friend: boolean; friend_request_sent: boolean; friend_request_received: boolean }> => {
    return apiRequest(`/friends/status/${userId}`);
  },
};

// Chat interfaces
export interface ChatMessage {
  id: number;
  message: string;
  sender: {
    id: number;
    name: string;
  };
  is_mine: boolean;
  is_read: boolean;
  created_at: string;
  conversation_id?: number;
  host_room?: string;
  remote_room?: string;
}

export interface Conversation {
  id: number;
  room_name: string;
  other_user: {
    id: number;
    name: string;
    email: string;
  };
  last_message?: {
    message: string;
    created_at: string;
    is_mine: boolean;
  };
  unread_count: number;
  updated_at: string;
}

// Chat API
export const chat = {
  getConversations: async (): Promise<Conversation[]> => {
    return apiRequest('/conversations');
  },

  getOrCreateConversation: async (userId: number): Promise<{ id: number; room_name: string; other_user: { id: number; name: string; email: string } }> => {
    const response = await apiRequest<{ id: number; room_name: string; other_user: { id: number; name: string; email: string } }>(`/conversations/with/${userId}`);

    // Format room name in ascending order (sort the room identifiers)
    const [room1, room2] = response.room_name.split('-');
    if (room1 && room2) {
      response.room_name = [room1, room2].sort().join('-');
    }
    console.log('response.room_name:' + response.room_name);
    return response;
  },

  getMessages: async (conversationId: number): Promise<{ room_name: string; messages: ChatMessage[] }> => {
    return apiRequest(`/conversations/${conversationId}/messages`);
  },

  sendMessage: async (conversationId: number, message: string): Promise<ChatMessage> => {
    return apiRequest(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};

// Admin API
export const admin = {
  // Get all users with roles (admin only)
  getAllUsers: async (params?: { role?: string; search?: string; per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<{ data: User[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>(`/admin/users${query}`);
  },

  // Update user role (admin only)
  updateUserRole: async (userId: number, role: string): Promise<{ message: string; user: { id: number; username: string; email: string; display_name: string; old_role: string; new_role: string } }> => {
    return apiRequest(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  // Bulk update user roles (admin only)
  bulkUpdateRoles: async (users: { user_id: number; role: string }[]): Promise<{ message: string; updated_users: any[]; errors: any[] }> => {
    return apiRequest('/admin/users/roles/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ users }),
    });
  },
};

export default {
  auth,
  posts,
  users,
  friends,
  chat,
  shops,
  shopPosts,
  admin,
};
