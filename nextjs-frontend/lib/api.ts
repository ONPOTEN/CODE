const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1';

// Token storage utilities
const TOKEN_KEY = 'api_token';

// Phone number utilities
/**
 * Validate Firebase phone number format
 * Must be exactly 10 digits (Vietnamese phone format)
 * Auto-adds +84 prefix for Firebase authentication
 *
 * Accepts formats:
 * - "0867631313" (10 digits starting with 0) → "+84867631313"
 * - "867631313" (9 digits, assumes 0 prefix) → "+84867631313"
 * - "84867631313" (12 digits with country code) → "+84867631313"
 * - "+84867631313" (already formatted) → "+84867631313"
 *
 * Returns: { valid: boolean, error?: string, normalized?: string }
 */
export const validateFirebasePhoneNumber = (phone: string): { valid: boolean; error?: string; normalized?: string } => {
  let normalized = phone.trim();

  // Remove all non-digit characters for counting
  const digitsOnly = normalized.replace(/[^\d]/g, '');

  // Case 1: 10 digits starting with 0 (e.g., "0867631313")
  if (/^0\d{9}$/.test(digitsOnly)) {
    // Remove leading 0 and add +84
    return { valid: true, normalized: '+84' + digitsOnly.substring(1) };
  }

  // Case 2: 9 digits without leading 0 (e.g., "867631313")
  if (/^\d{9}$/.test(digitsOnly)) {
    // Add +84 prefix
    return { valid: true, normalized: '+84' + digitsOnly };
  }

  // Case 3: 12 digits starting with 84 (e.g., "84867631313")
  if (/^84\d{10}$/.test(digitsOnly)) {
    // Already has country code, just add +
    return { valid: true, normalized: '+' + digitsOnly };
  }

  // Case 4: Already has +84 prefix (e.g., "+84867631313")
  if (/^\+84\d{10}$/.test(normalized)) {
    return { valid: true, normalized };
  }

  // Invalid format
  return {
    valid: false,
    error: `Invalid phone format. Expected 10 digits (Vietnamese format: 0XXXXXXXXX or XXXXXXXXX). Got ${digitsOnly.length} digits.`,
  };
};

/**
 * Encode phone number for URL-safe transmission
 * Handles international format with '+' prefix
 * Example: "+840867631313" → "%2B840867631313"
 */
export const encodePhoneNumber = (phone: string): string => {
  return encodeURIComponent(phone.trim());
};

/**
 * Normalize phone number to standard format with +84 prefix
 * For Firebase: Converts any 10-digit Vietnamese phone to +84 format
 * Enforces Vietnam country code +84 format
 *
 * Example: "867631313" → "+84867631313" (auto-adds +84 if missing)
 * Example: "0867631313" → "+84867631313" (converts 0-prefix to +84)
 * Example: "84867631313" → "+84867631313" (converts country code format)
 * Example: "+84867631313" → "+84867631313" (already correct)
 */
export const normalizePhoneNumber = (phone: string): string => {
  let normalized = phone.trim();

  // Remove all non-digit characters except +
  let digitsOnly = normalized.replace(/[^\d+]/g, '');

  // Remove + if present for processing
  digitsOnly = digitsOnly.replace(/\+/g, '');

  // If starts with 0, remove it (Vietnam local format: 0XXXXXXXXX → XXXXXXXXX)
  if (digitsOnly.startsWith('0')) {
    digitsOnly = digitsOnly.substring(1);
  }

  // If starts with 84, remove it (already has country code)
  if (digitsOnly.startsWith('84')) {
    digitsOnly = digitsOnly.substring(2);
  }

  // Now we should have 9 digits (local number without 0 prefix or country code)
  // Add 84 prefix for international format
  normalized = '+84' + digitsOnly;

  // Validate: should be +84 followed by 9 digits (total 12 chars)
  if (!/^\+84\d{9}$/.test(normalized)) {
    console.warn(`[Phone Normalization] Invalid phone format: ${phone} (normalized: ${normalized}). Expected format: +84XXXXXXXXX (10 digits total)`);
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

    console.error(`[handleResponse] Error ${response.status}:`, errorMessage);
    console.error(`[handleResponse] Error details:`, error);

    throw new ApiException(
      errorMessage,
      response.status,
      error.errors
    );
  }

  const data = await response.json();
  console.log(`[handleResponse] Success response (${response.status}):`, data);

  // Debug logging for shop requests
  if (typeof data === 'object' && data !== null && 'logo' in data) {
    console.log(`[handleResponse] Shop data with images:`, {
      id: data.id,
      name: data.name,
      logo: data.logo,
      banner: data.banner,
      hasLogo: !!data.logo,
      hasBanner: !!data.banner,
    });
  }

  return data;
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
  console.log(`[apiRequest] Method: ${options.method || 'GET'}`);
  if (options.body) {
    console.log(`[apiRequest] Body: ${options.body}`);
  }

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

  console.log(`[apiRequest] Request headers:`, config.headers);

  try {
    const response = await fetch(fullUrl, config);
    console.log(`[apiRequest] Response status: ${response.status}`);
    return handleResponse<T>(response);
  } catch (error) {
    console.error(`[apiRequest] Fetch error:`, error);
    throw error;
  }
}

// API request with file upload support
export async function apiRequestWithFiles<T = any>(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
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

  // For PUT requests, add _method field for Laravel method spoofing
  // This is needed because HTML forms don't natively support PUT
  if (method === 'PUT') {
    formData.append('_method', 'PUT');
  }

  // Debug logging
  console.log('[apiRequestWithFiles] Request details:', {
    url,
    method,
    hasAuth: !!token,
    hasContentType: 'Content-Type' in headers,
    formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
      key,
      valueType: value instanceof File ? `File(${(value as File).name})` : typeof value,
    })),
  });

  // Don't set Content-Type for FormData - browser will set it with boundary
  // For PUT requests, we use POST with _method field (Laravel method spoofing)
  const config: RequestInit = {
    method: method === 'PUT' ? 'POST' : 'POST',
    headers,
    body: formData,
  };

  const response = await fetch(url, config);
  console.log('[apiRequestWithFiles] Response status:', response.status);
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

  facebookLogin: async (accessToken: string): Promise<LoginResponse> => {
    const response = await apiRequest<any>('/auth/facebook-login', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    });

    // Store the token
    if (response.token) {
      tokenStorage.set(response.token);
    }

    return {
      user: response.user,
      token: response.token,
      message: response.message,
    };
  },

  googleLogin: async (accessToken: string): Promise<LoginResponse> => {
    const response = await apiRequest<any>('/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    });

    // Store the token
    if (response.token) {
      tokenStorage.set(response.token);
    }

    return {
      user: response.user,
      token: response.token,
      message: response.message,
    };
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
  video?: string;  // Video URL (mp4)
  author?: User;  // Author information with avatar
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
  video?: File;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  excerpt?: string;
  type?: 'post' | 'page' | 'product';
  status?: 'publish' | 'draft' | 'pending';
  visibility?: 'public' | 'private';
  images?: File[];
  video?: File;
  remove_video?: boolean;
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
    const response = await apiRequest<any>(`/posts/${id}`);
    // Handle wrapped response format (data property)
    console.log('[posts.getById] Raw response:', response);
    const post = response.data || response;
    console.log('[posts.getById] Extracted post:', post);
    return post as Post;
  },

  getBySlug: async (slug: string) => {
    const response = await apiRequest<any>(`/posts/slug/${slug}`);
    const post = response.data || response;
    return post as Post;
  },

  getByType: async (type: string, params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Post>>(`/posts/type/${type}${query}`);
  },

  create: async (data: CreatePostData): Promise<CreatePostResponse> => {
    // If there are images or video, use FormData
    if ((data.images && data.images.length > 0) || data.video) {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      if (data.excerpt) formData.append('excerpt', data.excerpt);
      if (data.type) formData.append('type', data.type);
      if (data.status) formData.append('status', data.status);

      // Append images
      if (data.images) {
        data.images.forEach((image) => {
          formData.append('images[]', image);
        });
      }

      // Append video
      if (data.video) {
        formData.append('video', data.video);
      }

      return apiRequestWithFiles<CreatePostResponse>('/posts', formData);
    }

    // Otherwise use JSON
    return apiRequest<CreatePostResponse>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: UpdatePostData): Promise<CreatePostResponse> => {
    // If there are images, video, or remove_images, use FormData
    if ((data.images && data.images.length > 0) || (data.remove_images && data.remove_images.length > 0) || data.video || data.remove_video) {
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

      // Append video
      if (data.video) {
        formData.append('video', data.video);
      }

      // Append remove_video flag
      if (data.remove_video) {
        formData.append('remove_video', '1');
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

  userWall: async (userId: number, params?: { per_page?: number; page?: number; search?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.type) searchParams.append('type', params.type);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Post>>(`/users/${userId}/wall${query}`);
  },

  sharedWall: async (userId: number, params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Post>>(`/users/${userId}/shared-wall${query}`);
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/posts/${id}`, {
      method: 'DELETE',
    });
  },

  shareToWall: async (postId: number, wallId: number): Promise<{ success: boolean; message: string; post: Post }> => {
    return apiRequest<{ success: boolean; message: string; post: Post }>(`/posts/${postId}/share-to-wall`, {
      method: 'POST',
      body: JSON.stringify({ wall_id: wallId }),
    });
  },

  deleteSharedPost: async (postId: number, wallId: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(`/posts/${postId}/shared-wall`, {
      method: 'DELETE',
      body: JSON.stringify({ wall_id: wallId }),
    });
  },
};

// Users API
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  display_name?: string;
  hobby?: string;
  company?: string;
  occupation?: string;
  main_occupation?: string;
  location?: string;
  role?: string;
  avatar?: string;
  avatar_url?: string;
  profile_visibility?: string;
  phone?: string;
  email_public?: boolean;
  hobby_public?: boolean;
  company_public?: boolean;
  occupation_public?: boolean;
  main_occupation_public?: boolean;
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
    // Add timestamp to prevent caching issues
    const timestamp = Date.now();
    return apiRequest<User>(`/users/${id}?_t=${timestamp}`);
  },

  getByUsername: async (username: string) => {
    return apiRequest<User>(`/users/username/${username}`);
  },

  search: async (query: string): Promise<{ data: User[] }> => {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    return apiRequest(`/users/search?${searchParams}`);
  },

  updateProfile: async (data: { user_login?: string; display_name?: string; user_email?: string; hobby?: string; company?: string; occupation?: string; main_occupation?: string; location?: string; profile_visibility?: string; email_public?: boolean; hobby_public?: boolean; company_public?: boolean; occupation_public?: boolean; main_occupation_public?: boolean; location_public?: boolean; phone_public?: boolean }): Promise<User> => {
    // NOTE: phone field is intentionally not included - phone cannot be changed
    // role field is intentionally not included - users cannot change their own role
    console.log('[users.updateProfile] Calling API with data:', data);
    try {
      const response = await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('[users.updateProfile] Response received:', response);
      return response;
    } catch (error) {
      console.error('[users.updateProfile] Error caught:', error);
      throw error;
    }
  },

  updatePassword: async (data: { current_password: string; new_password: string; new_password_confirmation: string }): Promise<{ message: string }> => {
    return apiRequest('/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar: async (file: File): Promise<{
    message: string;
    avatar: string;
    avatar_url: string;
    user?: User;
  }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    // Debug logging
    console.log('[uploadAvatar] File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });
    console.log('[uploadAvatar] FormData contents:', {
      hasAvatar: formData.has('avatar'),
      entriesCount: Array.from(formData.entries()).length,
    });

    return apiRequestWithFiles('/profile/avatar', formData);
  },
};

// Group interfaces
export interface Group {
  group_id: number;
  group_name: string;
  description?: string;
  group_owner_id: number;
  status: 'active' | 'inactive';
  visibility: 'public' | 'private';
  avatar?: string;
  cover_image?: string;
  requires_approval?: boolean;
  requires_approval_posts?: boolean;
  owner?: User;
  posts_count?: number;
  members_count?: number;
  created_at: string;
  updated_at: string;
}

export interface GroupPost {
  id: number;
  group_id: number;
  post_author: number;
  post_title: string;
  post_content: string;
  post_excerpt?: string;
  post_status: 'draft' | 'publish' | 'pending' | 'trash';
  post_type: string;
  post_date: string;
  post_modified: string;
  comment_status: string;
  ping_status: string;
  visibility: 'public' | 'private';
  featured_image?: string;
  comment_count?: number;
  author?: User;
  group?: Group;
  images?: string[];
  likes_count?: number;
  dislikes_count?: number;
  comments_count?: number;
}

// Groups API
export const groups = {
  index: async (params?: { per_page?: number; page?: number; search?: string; visibility?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.visibility) searchParams.append('visibility', params.visibility);
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Group>>(`/groups${query}`);
  },

  getById: async (id: number) => {
    return apiRequest<{ data: Group }>(`/groups/${id}`);
  },

  popular: async (params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Group>>(`/groups/popular${query}`);
  },

  userGroups: async (userId: number, params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Group>>(`/users/${userId}/groups${query}`);
  },

  create: async (data: { group_name: string; description?: string; visibility: string }): Promise<{ data: Group; message: string }> => {
    return apiRequest('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  store: async (data: FormData): Promise<{ data: Group; message: string }> => {
    return apiRequestWithFiles('/groups', data);
  },

  update: async (id: number, data: Partial<Group>): Promise<{ data: Group; message: string }> => {
    return apiRequest(`/groups/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateWithFiles: async (id: number, data: FormData): Promise<{ data: Group; message: string }> => {
    return apiRequestWithFiles<{ data: Group; message: string }>(`/groups/${id}`, data);
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest(`/groups/${id}`, {
      method: 'DELETE',
    });
  },

  myGroups: async (params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<Group>>(`/my-groups${query}`);
  },

  bulkDelete: async (groupIds: number[]): Promise<{ message: string; deleted_count: number }> => {
    return apiRequest('/groups/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ group_ids: groupIds }),
    });
  },

  checkMembership: async (groupId: number): Promise<{ is_member: boolean; group_id: number }> => {
    return apiRequest(`/groups/${groupId}/check-membership`);
  },

  joinGroup: async (groupId: number): Promise<{ message: string; is_member: boolean; status?: 'pending' | 'approved' }> => {
    return apiRequest(`/groups/${groupId}/join`, {
      method: 'POST',
    });
  },

  leaveGroup: async (groupId: number): Promise<{ message: string; is_member: boolean }> => {
    return apiRequest(`/groups/${groupId}/leave`, {
      method: 'POST',
    });
  },

  getPendingRequests: async (groupId: number): Promise<{ data: any[]; total: number }> => {
    return apiRequest(`/groups/${groupId}/pending-requests`);
  },

  acceptJoinRequest: async (groupId: number, userId: number): Promise<{ message: string; user_id: number; status: string }> => {
    return apiRequest(`/groups/${groupId}/requests/${userId}/accept`, {
      method: 'POST',
    });
  },

  rejectJoinRequest: async (groupId: number, userId: number): Promise<{ message: string; user_id: number }> => {
    return apiRequest(`/groups/${groupId}/requests/${userId}/reject`, {
      method: 'POST',
    });
  },

  getGroupMembers: async (groupId: number): Promise<{ data: any[] }> => {
    return apiRequest(`/groups/${groupId}/members`);
  },

  removeMember: async (groupId: number, userId: number): Promise<{ message: string }> => {
    return apiRequest(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // Group Chat Messages
  saveMessage: async (groupId: number, message: string, userId: number): Promise<{ data: any; message: string }> => {
    console.log('[API] saveMessage called:', {
      endpoint: `/groups/${groupId}/messages`,
      method: 'POST',
      groupId,
      userId,
      messageLength: message.length,
      messagePreview: message.substring(0, 50),
    });

    try {
      const response = await apiRequest(`/groups/${groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          user_id: userId,
        }),
      });

      console.log('[API] saveMessage success:', {
        groupId,
        userId,
        responseMessageId: response?.data?.id,
        responseStatus: response?.message,
      });

      return response;
    } catch (error: any) {
      console.error('[API] saveMessage failed:', {
        groupId,
        userId,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorResponse: error?.response,
      });
      throw error;
    }
  },

  getMessages: async (groupId: number, params?: { per_page?: number; page?: number }): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<any>>(`/groups/${groupId}/messages${query}`);
  },

  deleteMessage: async (groupId: number, messageId: number): Promise<{ message: string }> => {
    return apiRequest(`/groups/${groupId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  updateMessage: async (groupId: number, messageId: number, message: string): Promise<{ data: any; message: string }> => {
    return apiRequest(`/groups/${groupId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ message }),
    });
  },
};

// Group Posts API
export const groupPosts = {
  index: async (params?: { per_page?: number; page?: number; group_id?: number; status?: string; type?: string; sort_by?: string; order?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.group_id) searchParams.append('group_id', params.group_id.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.order) searchParams.append('order', params.order);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<GroupPost>>(`/group-posts${query}`);
  },

  getById: async (id: number) => {
    return apiRequest<{ data: GroupPost }>(`/group-posts/${id}`);
  },

  getByGroupId: async (groupId: number, params?: { per_page?: number; page?: number; status?: string; sort_by?: string; order?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.order) searchParams.append('order', params.order);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<GroupPost>>(`/groups/${groupId}/posts${query}`);
  },

  userPosts: async (userId: number, params?: { per_page?: number; page?: number; group_id?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.group_id) searchParams.append('group_id', params.group_id.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<GroupPost>>(`/users/${userId}/group-posts${query}`);
  },

  popular: async (params?: { per_page?: number; page?: number; days?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.days) searchParams.append('days', params.days.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<GroupPost>>(`/group-posts/popular${query}`);
  },

  create: async (data: any): Promise<{ data: GroupPost; message: string }> => {
    // Support both FormData (with file uploads) and regular objects
    if (data instanceof FormData) {
      return apiRequestWithFiles('/group-posts', data);
    }
    return apiRequest('/group-posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<GroupPost>): Promise<{ data: GroupPost; message: string }> => {
    return apiRequest(`/group-posts/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateWithFiles: async (id: number, data: FormData): Promise<{ data: GroupPost; message: string }> => {
    return apiRequestWithFiles(`/group-posts/${id}`, data);
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest(`/group-posts/${id}`, {
      method: 'DELETE',
    });
  },

  bulkDelete: async (postIds: number[]): Promise<{ message: string; deleted_count: number }> => {
    return apiRequest('/group-posts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ post_ids: postIds }),
    });
  },

  // GroupPost engagement using GroupPostEngagementController
  like: async (id: number): Promise<{ message: string; likes_count: number; liked: boolean }> => {
    return apiRequest(`/group-posts/${id}/engage/like`, {
      method: 'POST',
    });
  },

  unlike: async (id: number): Promise<{ message: string; likes_count: number; liked: boolean }> => {
    return apiRequest(`/group-posts/${id}/engage/like`, {
      method: 'DELETE',
    });
  },

  dislike: async (id: number): Promise<{ message: string; dislikes_count: number; disliked: boolean }> => {
    return apiRequest(`/group-posts/${id}/engage/dislike`, {
      method: 'POST',
    });
  },

  removeDislike: async (id: number): Promise<{ message: string; dislikes_count: number; disliked: boolean }> => {
    return apiRequest(`/group-posts/${id}/engage/dislike`, {
      method: 'DELETE',
    });
  },

  share: async (id: number, sharedVia?: string): Promise<{ message: string; shares_count: number; shared_via: string }> => {
    return apiRequest(`/group-posts/${id}/engage/share`, {
      method: 'POST',
      body: JSON.stringify({ shared_via: sharedVia || 'direct' }),
    });
  },

  getEngagementStats: async (id: number) => {
    return apiRequest<{
      post_id: number;
      likes: { count: number; user_liked: boolean };
      dislikes: { count: number; user_disliked: boolean };
      comments: { count: number };
      shares: { count: number };
    }>(`/group-posts/${id}/engage/stats`);
  },

  getLikes: async (id: number, params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<{ total: number; data: any[]; pagination: any }>(`/group-posts/${id}/engage/likes${query}`);
  },

  getShares: async (id: number, params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<{ total: number; data: any[]; pagination: any }>(`/group-posts/${id}/engage/shares${query}`);
  },

  getComments: async (id: number, params?: { per_page?: number; page?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<any>>(`/group-posts/${id}/comments${query}`);
  },

  createComment: async (id: number, data: { comment_content: string; parent_id?: number }): Promise<{ data: any; message: string }> => {
    return apiRequest(`/group-posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateComment: async (postId: number, commentId: number, data: { comment_content: string }): Promise<{ data: any; message: string }> => {
    return apiRequest(`/group-posts/${postId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteComment: async (postId: number, commentId: number): Promise<{ message: string }> => {
    return apiRequest(`/group-posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  setFeaturedImage: async (id: number, formData: FormData): Promise<{ data: GroupPost; message: string }> => {
    return apiRequestWithFiles(`/group-posts/${id}/featured-image`, formData);
  },

  // Post Moderation (admin/moderator only)
  approvePost: async (groupId: number, postId: number): Promise<{ data: GroupPost; message: string }> => {
    return apiRequest(`/groups/${groupId}/posts/${postId}/approve`, {
      method: 'POST',
    });
  },

  rejectPost: async (groupId: number, postId: number): Promise<{ message: string; post_id: number; status: string }> => {
    return apiRequest(`/groups/${groupId}/posts/${postId}/reject`, {
      method: 'POST',
    });
  },

  getPendingPosts: async (groupId: number): Promise<{ data: GroupPost[]; total: number }> => {
    return apiRequest(`/groups/${groupId}/posts/pending`);
  },

  deletePost: async (postId: number): Promise<{ message: string }> => {
    return apiRequest(`/group-posts/${postId}`, {
      method: 'DELETE',
    });
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
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  image_5?: string;
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
  logo?: string | File;
  banner?: string | File;
  image_1?: string | File;
  image_2?: string | File;
  image_3?: string | File;
  image_4?: string | File;
  image_5?: string | File;
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

  create: async (data: CreateShopData | FormData): Promise<{ message: string; shop: Shop }> => {
    // Support both FormData (with file uploads) and regular objects
    if (data instanceof FormData) {
      return apiRequestWithFiles('/shops', data, 'POST');
    }
    return apiRequest('/shops', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<CreateShopData> | FormData): Promise<{ message: string; shop: Shop }> => {
    // Support both FormData (with file uploads) and regular objects
    if (data instanceof FormData) {
      return apiRequestWithFiles(`/shops/${id}`, data, 'PUT');
    }
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
  product_type?: 'Đơn giản' | 'Biến thể' | 'Tải xuống'; // Product type for product posts
  price?: string | number; // Simple product price
  sale_price?: string | number; // Simple product sale price
  short_description?: string; // Simple product description
  detail_description?: string; // Simple product detailed description
  categories?: string; // Simple product categories
  attributes?: any[]; // Variant product attributes
  download_files?: any[]; // Download product files
  link_files?: any[]; // Download product links
  main_image?: string; // Product main image
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
  // Get latest products feed across all shops
  getFeed: async (params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<ShopPost>>(`/shops/products/feed${query}`);
  },

  // Get trending products across all shops (sorted by view count)
  getTrending: async (params?: { per_page?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiRequest<PaginatedResponse<ShopPost>>(`/shops/products/trending${query}`);
  },

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

  create: async (shopId: number, data: CreateShopPostData | FormData): Promise<{ message: string; post: ShopPost }> => {
    // Support both FormData (with file uploads) and regular objects
    if (data instanceof FormData) {
      return apiRequestWithFiles(`/shops/${shopId}/posts`, data);
    }
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

  block: async (userId: number): Promise<{ message: string }> => {
    return apiRequest(`/friends/block/${userId}`, {
      method: 'POST',
    });
  },

  unblock: async (userId: number): Promise<{ message: string }> => {
    return apiRequest(`/friends/unblock/${userId}`, {
      method: 'DELETE',
    });
  },

  getBlockedUsers: async (): Promise<{ data: User[] }> => {
    return apiRequest('/friends/blocked');
  },
};

// Chat interfaces
export interface ChatMessage {
  id: number;
  message: string;
  sender: {
    id: number;
    name: string;
    email?: string;
  };
  sender_id?: number;
  is_mine: boolean;
  is_read: boolean;
  created_at: string;
  conversation_id?: number;
  host_room?: string;
  remote_room?: string;
  shop_id?: number;
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
  shop_owner_id?: number; // Optional: for shop message rooms, the ID of the shop owner
}

// Wall Post interfaces
export interface WallPost {
  id: number;
  wall_id: number;
  post_id?: number;
  group_post_id?: number;
  post_type: 'wppost' | 'grouppost';
  status: 'pending' | 'accepted' | 'rejected';
  rejection_reason?: string;
  post: GroupPost | Post;
  wall_owner: User;
  moderator?: User;
  moderated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WallPostStatistics {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  wppost_count: number;
  grouppost_count: number;
}

// Wall Posts API
export const wallPosts = {
  getAll: async (params?: {
    per_page?: number;
    page?: number;
    status?: string;
    post_type?: 'wppost' | 'grouppost';
    order_by?: string;
    order?: 'asc' | 'desc';
  }): Promise<{
    data: WallPost[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.post_type) queryParams.append('post_type', params.post_type);
    if (params?.order_by) queryParams.append('order_by', params.order_by);
    if (params?.order) queryParams.append('order', params.order);

    const query = queryParams.toString();
    return apiRequest(`/wall-posts${query ? '?' + query : ''}`);
  },

  getById: async (wallPostId: number): Promise<WallPost> => {
    return apiRequest(`/wall-posts/${wallPostId}`);
  },

  accept: async (wallPostId: number): Promise<{ message: string; data: WallPost }> => {
    return apiRequest(`/wall-posts/${wallPostId}/accept`, {
      method: 'POST',
    });
  },

  reject: async (wallPostId: number, rejectionReason?: string): Promise<{ message: string; data: WallPost }> => {
    return apiRequest(`/wall-posts/${wallPostId}/reject`, {
      method: 'POST',
      body: JSON.stringify({
        rejection_reason: rejectionReason || '',
      }),
    });
  },

  pendingCount: async (): Promise<{ count: number }> => {
    return apiRequest('/wall-posts/pending-count');
  },

  statistics: async (): Promise<WallPostStatistics> => {
    return apiRequest('/wall-posts/statistics');
  },

  batchAction: async (wallPostIds: number[], action: 'accept' | 'reject'): Promise<{ message: string; count: number }> => {
    return apiRequest('/wall-posts/batch-action', {
      method: 'POST',
      body: JSON.stringify({
        wall_post_ids: wallPostIds,
        action,
      }),
    });
  },
};

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

  // Get messages for a shop message room by room name
  // Used when accessing /messages?with={customerId}&shopId={shopId}
  // Note: This uses the customer-messages endpoint which we know works reliably
  getShopMessagesByRoomName: async (roomName: string, shopId?: number, customerId?: number): Promise<{ room_name: string; messages: ChatMessage[] }> => {
    // Extract shop ID and customer ID from room name if not provided
    // Room name format: "{customerId}-shop{shopId}" e.g., "656-shop1"
    let extractedShopId = shopId;
    let extractedCustomerId = customerId;

    if (!extractedShopId || !extractedCustomerId) {
      const match = roomName.match(/^(\d+)-shop(\d+)$/);
      if (match) {
        extractedCustomerId = parseInt(match[1], 10);
        extractedShopId = parseInt(match[2], 10);
      }
    }

    console.log('[api.getShopMessagesByRoomName] Extracted IDs from room name:', {
      roomName,
      customerId: extractedCustomerId,
      shopId: extractedShopId,
    });

    if (!extractedShopId || !extractedCustomerId) {
      console.warn('[api.getShopMessagesByRoomName] Could not extract shop/customer IDs from room name:', roomName);
      return {
        room_name: roomName,
        messages: [],
      };
    }

    // Use the customer-specific endpoint which works for both customers AND shop owners
    // Endpoint: /shops/{shopId}/messages/customer/{customerId}
    // This endpoint doesn't require forOwner() check, so it works regardless of user role
    let response: any;
    try {
      const endpoint = `/shops/${extractedShopId}/messages/customer/${extractedCustomerId}?per_page=100`;
      console.log('[api.getShopMessagesByRoomName] Calling API endpoint:', {
        endpoint,
        shopId: extractedShopId,
        customerId: extractedCustomerId,
      });
      response = await apiRequest<{ data: any[] }>(endpoint);
      console.log('[api.getShopMessagesByRoomName] Full API response:', response);
    } catch (error) {
      console.error('[api.getShopMessagesByRoomName] API call failed:', error);
      console.error('[api.getShopMessagesByRoomName] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        endpoint: `/shops/${extractedShopId}/messages/customer/${extractedCustomerId}?per_page=100`,
        shopId: extractedShopId,
        customerId: extractedCustomerId,
      });
      throw error;
    }

    console.log('[api.getShopMessagesByRoomName] API Response:', {
      room_name: roomName,
      message_count: response?.data?.length || 0,
      raw_data: response?.data,
      response_structure: Object.keys(response || {}),
    });

    // Get ALL messages from the response (both directions: customer -> shop and shop -> customer)
    const allMessages = response.data || [];

    console.log('[api.getShopMessagesByRoomName] All shop messages retrieved:', {
      total_messages: allMessages.length,
      shop_id: extractedShopId,
      customer_id: extractedCustomerId,
      allMessages: allMessages,
    });

    const formattedMessages: ChatMessage[] = allMessages.map((msg: any) => ({
      id: msg.id,
      conversation_id: msg.room_id || 0,
      sender_id: msg.sender_id,
      message: msg.message,
      created_at: msg.created_at,
      is_mine: false, // Will be determined in ChatWindow based on sender_id vs current user
      sender: msg.sender || {
        id: msg.sender_id,
        name: msg.sender?.name || `User ${msg.sender_id}`,
        display_name: msg.sender?.display_name,
      },
    }));

    console.log('[api.getShopMessagesByRoomName] Formatted Messages:', {
      count: formattedMessages.length,
      messages: formattedMessages,
    });

    const result = {
      room_name: roomName,
      messages: formattedMessages,
    };

    console.log('[api.getShopMessagesByRoomName] FINAL RETURN VALUE:', {
      room_name: result.room_name,
      message_count: result.messages.length,
      messages: result.messages,
    });

    return result;
  },

  // Get messages between a customer and shop (alternative method)
  getShopCustomerMessages: async (shopId: number, customerId: number): Promise<{ messages: ChatMessage[] }> => {
    // Get all messages for the shop, then filter by customer/sender_id
    const response = await apiRequest<{ data: any[] }>(`/shops/${shopId}/messages?per_page=100`);

    // Filter messages for this specific customer
    const allMessages = response.data || [];
    const customerMessages = allMessages.filter((msg: any) => msg.sender_id === customerId);

    // Transform the response to match ChatMessage format
    const formattedMessages: ChatMessage[] = customerMessages.map((msg: any) => ({
      id: msg.id,
      conversation_id: msg.room_id || 0,
      sender_id: msg.sender_id,
      message: msg.message,
      created_at: msg.created_at,
      is_mine: false, // Will be determined in ChatWindow based on sender_id vs current user
      is_read: msg.is_read || false,
      sender: msg.sender || {
        id: msg.sender_id,
        name: msg.sender?.name || `User ${msg.sender_id}`,
        display_name: msg.sender?.display_name,
      },
    }));

    return {
      messages: formattedMessages,
    };
  },

  // Send a shop message
  sendShopMessage: async (shopId: number, customerId: number, senderId: number, message: string, shopOwnerId?: number): Promise<{ id: number; message: string; sender_id: number; created_at: string }> => {
    const roomName = `${customerId}-shop${shopId}`;

    console.log('[api.sendShopMessage] Sending message:', {
      shopId,
      customerId,
      senderId,
      roomName,
      message: message.substring(0, 50),
      shopOwnerId_provided: shopOwnerId,
    });

    // Use provided shop owner ID, or fetch if not provided
    let resolvedShopOwnerId = shopOwnerId;

    if (!resolvedShopOwnerId) {
      console.log('[api.sendShopMessage] No shop owner ID provided, attempting to fetch from shop data');
      try {
        const shopData = await shops.getById(shopId);

        console.log('[api.sendShopMessage] Shop data fetched:', {
          id: shopData.id,
          user_id: shopData.user_id,
          name: shopData.name,
          keys: Object.keys(shopData),
        });

        resolvedShopOwnerId = shopData.user_id;
        if (!resolvedShopOwnerId) {
          console.error('[api.sendShopMessage] Shop owner ID is undefined or null:', shopData);
          throw new Error(`Shop ${shopId} has no user_id`);
        }
        console.log('[api.sendShopMessage] Found shop owner ID:', resolvedShopOwnerId, 'for shop:', shopId);
      } catch (error) {
        console.error('[api.sendShopMessage] Failed to fetch shop:', error);
        throw error;
      }
    } else {
      console.log('[api.sendShopMessage] Using provided shop owner ID:', resolvedShopOwnerId);
    }

    const shopOwnerId_final = resolvedShopOwnerId;

    // Validate shop_owner_id is a number
    if (typeof shopOwnerId_final !== 'number' || !shopOwnerId_final) {
      console.error('[api.sendShopMessage] Invalid shop_owner_id:', {
        shopOwnerId_final,
        type: typeof shopOwnerId_final,
        isNumber: typeof shopOwnerId_final === 'number',
        isTruthy: !!shopOwnerId_final,
      });
      throw new Error(`Invalid shop owner ID: ${shopOwnerId_final}`);
    }

    // Validate all required fields are numbers
    if (typeof shopId !== 'number' || !shopId) {
      throw new Error(`Invalid shop_id: ${shopId}`);
    }
    if (typeof senderId !== 'number' || !senderId) {
      throw new Error(`Invalid sender_id: ${senderId}`);
    }

    const payloadData = {
      shop_id: shopId,
      sender_id: senderId,
      shop_owner_id: shopOwnerId_final,
      message: message,
    };

    console.log('[api.sendShopMessage] Final request payload:', {
      shop_id: payloadData.shop_id,
      shop_id_type: typeof payloadData.shop_id,
      sender_id: payloadData.sender_id,
      sender_id_type: typeof payloadData.sender_id,
      shop_owner_id: payloadData.shop_owner_id,
      shop_owner_id_type: typeof payloadData.shop_owner_id,
      message_length: payloadData.message.length,
      payload_string: JSON.stringify(payloadData),
    });

    const response = await apiRequest<{ message: string; data: { id: number; message: string; sender_id: number; created_at: string } }>(
      `/shops/${shopId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payloadData),
      }
    );

    console.log('[api.sendShopMessage] Full API response:', response);

    // Extract the actual message data from the response wrapper
    // API returns { message: "...", data: { id, message, sender_id, created_at, ... } }
    if (response && response.data) {
      const messageData = {
        id: response.data.id,
        message: response.data.message,
        sender_id: response.data.sender_id,
        created_at: response.data.created_at,
      };

      console.log('[api.sendShopMessage] Message sent successfully with ID:', messageData.id);
      return messageData;
    } else {
      console.error('[api.sendShopMessage] Unexpected API response structure:', response);
      throw new Error('Invalid API response: missing data field');
    }
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

  // Get a single user by ID (admin only)
  getUser: async (userId: number): Promise<{ user: User }> => {
    return apiRequest(`/admin/users/${userId}`);
  },

  // Create a new user (admin only)
  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    role?: string;
    phone?: string;
    hobby?: string;
    company?: string;
    occupation?: string;
    main_occupation?: string;
    location?: string;
    profile_visibility?: string;
  }): Promise<{ message: string; user: User }> => {
    return apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Update a user (admin only)
  updateUser: async (userId: number, userData: {
    username?: string;
    email?: string;
    password?: string;
    display_name?: string;
    role?: string;
    phone?: string;
    hobby?: string;
    company?: string;
    occupation?: string;
    main_occupation?: string;
    location?: string;
    profile_visibility?: string;
    email_public?: boolean;
    hobby_public?: boolean;
    company_public?: boolean;
    occupation_public?: boolean;
    main_occupation_public?: boolean;
    location_public?: boolean;
    phone_public?: boolean;
  }): Promise<{ message: string; user: User }> => {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Delete a user (admin only)
  deleteUser: async (userId: number): Promise<{ message: string; deleted_user: { id: number; username: string; email: string } }> => {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // Post Management (WpPost - Wall Posts)
  // ==========================================

  // Get all posts with filters (admin only)
  getPosts: async (params?: {
    status?: string;
    type?: string;
    author_id?: number;
    search?: string;
    order_by?: string;
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<any> => {
    const queryString = new URLSearchParams();
    if (params?.status) queryString.append('status', params.status);
    if (params?.type) queryString.append('type', params.type);
    if (params?.author_id) queryString.append('author_id', params.author_id.toString());
    if (params?.search) queryString.append('search', params.search);
    if (params?.order_by) queryString.append('order_by', params.order_by);
    if (params?.order) queryString.append('order', params.order);
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());
    if (params?.page) queryString.append('page', params.page.toString());

    return apiRequest(`/admin/posts?${queryString.toString()}`);
  },

  // Get a single post (admin only)
  getPost: async (postId: number): Promise<any> => {
    return apiRequest(`/admin/posts/${postId}`);
  },

  // Create a new post (admin only)
  createPost: async (postData: {
    title: string;
    content: string;
    excerpt?: string;
    type?: 'post' | 'page' | 'product';
    status?: 'publish' | 'draft' | 'pending' | 'trash';
    author_id?: number;
    wall_id?: number;
  }): Promise<{ message: string; post: any }> => {
    return apiRequest('/admin/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  // Update a post (admin only)
  updatePost: async (postId: number, postData: {
    title?: string;
    content?: string;
    excerpt?: string;
    type?: 'post' | 'page' | 'product';
    status?: 'publish' | 'draft' | 'pending' | 'trash';
    visibility?: 'public' | 'private';
  }): Promise<{ message: string; post: any }> => {
    return apiRequest(`/admin/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  },

  // Delete a post (admin only)
  deletePost: async (postId: number): Promise<{ message: string; deleted_post: { id: number; title: string } }> => {
    return apiRequest(`/admin/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // Group Post Management
  // ==========================================

  // Get all group posts with filters (admin only)
  getGroupPosts: async (params?: {
    group_id?: number;
    status?: string;
    author_id?: number;
    search?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<any> => {
    const queryString = new URLSearchParams();
    if (params?.group_id) queryString.append('group_id', params.group_id.toString());
    if (params?.status) queryString.append('status', params.status);
    if (params?.author_id) queryString.append('author_id', params.author_id.toString());
    if (params?.search) queryString.append('search', params.search);
    if (params?.sort_by) queryString.append('sort_by', params.sort_by);
    if (params?.order) queryString.append('order', params.order);
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());
    if (params?.page) queryString.append('page', params.page.toString());

    return apiRequest(`/admin/group-posts?${queryString.toString()}`);
  },

  // Get a single group post (admin only)
  getGroupPost: async (postId: number): Promise<any> => {
    return apiRequest(`/admin/group-posts/${postId}`);
  },

  // Create a new group post (admin only)
  createGroupPost: async (postData: {
    group_id: number;
    title: string;
    content: string;
    excerpt?: string;
    status?: 'publish' | 'draft' | 'pending' | 'trash';
    type?: 'post' | 'page';
    author_id?: number;
    visibility?: 'public' | 'private';
  }): Promise<{ data: any; message: string }> => {
    return apiRequest('/admin/group-posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  // Update a group post (admin only)
  updateGroupPost: async (postId: number, postData: {
    title?: string;
    content?: string;
    excerpt?: string;
    status?: 'publish' | 'draft' | 'pending' | 'trash';
    type?: 'post' | 'page';
    visibility?: 'public' | 'private';
  }): Promise<{ data: any; message: string }> => {
    return apiRequest(`/admin/group-posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  },

  // Delete a group post (admin only)
  deleteGroupPost: async (postId: number): Promise<{ message: string; deleted_post: { id: number; title: string; group_id: number } }> => {
    return apiRequest(`/admin/group-posts/${postId}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // Shop Post Management
  // ==========================================

  // Get all shop posts with filters (admin only)
  getShopPosts: async (params?: {
    shop_id?: number;
    type?: 'post' | 'page';
    status?: 'draft' | 'published';
    user_id?: number;
    search?: string;
    order_by?: string;
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<any> => {
    const queryString = new URLSearchParams();
    if (params?.shop_id) queryString.append('shop_id', params.shop_id.toString());
    if (params?.type) queryString.append('type', params.type);
    if (params?.status) queryString.append('status', params.status);
    if (params?.user_id) queryString.append('user_id', params.user_id.toString());
    if (params?.search) queryString.append('search', params.search);
    if (params?.order_by) queryString.append('order_by', params.order_by);
    if (params?.order) queryString.append('order', params.order);
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());
    if (params?.page) queryString.append('page', params.page.toString());

    return apiRequest(`/admin/shop-posts?${queryString.toString()}`);
  },

  // Get a single shop post (admin only)
  getShopPost: async (postId: number): Promise<any> => {
    return apiRequest(`/admin/shop-posts/${postId}`);
  },

  // Create a new shop post (admin only)
  createShopPost: async (postData: {
    shop_id: number;
    category_id?: number | null;
    title: string;
    content?: string;
    price_range?: string;
    type: 'post' | 'page';
    status: 'draft' | 'published';
    user_id?: number;
    product_type?: 'simple' | 'variant' | 'download';
    price?: number;
    sale_price?: number;
    short_description?: string;
    detail_description?: string;
  }): Promise<{ message: string; post: any }> => {
    return apiRequest('/admin/shop-posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  // Update a shop post (admin only)
  updateShopPost: async (postId: number, postData: {
    category_id?: number | null;
    title?: string;
    content?: string;
    price_range?: string;
    type?: 'post' | 'page';
    status?: 'draft' | 'published';
    product_type?: 'simple' | 'variant' | 'download';
    price?: number;
    sale_price?: number;
    short_description?: string;
    detail_description?: string;
  }): Promise<{ message: string; post: any }> => {
    return apiRequest(`/admin/shop-posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  },

  // Delete a shop post (admin only)
  deleteShopPost: async (postId: number): Promise<{ message: string; deleted_post: { id: number; title: string; shop_id: number } }> => {
    return apiRequest(`/admin/shop-posts/${postId}`, {
      method: 'DELETE',
    });
  },
};

// Orders API
export const orders = {
  // Get all orders for current user
  myOrders: async (params?: { status?: string; shop_id?: number; per_page?: number }): Promise<any> => {
    const queryString = new URLSearchParams();
    if (params?.status) queryString.append('status', params.status);
    if (params?.shop_id) queryString.append('shop_id', params.shop_id.toString());
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());

    return apiRequest(`/orders?${queryString.toString()}`, {
      method: 'GET',
    });
  },

  // Get a specific order
  get: async (orderId: number): Promise<any> => {
    return apiRequest(`/orders/${orderId}`, {
      method: 'GET',
    });
  },

  // Place a new order
  create: async (orderData: {
    items: Array<{
      shop_post_id: number;
      quantity: number;
      variant_options?: Record<string, string> | null;
    }>;
    subtotal: number;
    tax?: number;
    shipping_fee?: number;
    discount?: number;
    total_amount: number;
    notes?: string;
    shipping_address: {
      full_name: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      postal_code: string;
    };
    billing_address?: {
      full_name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };
    payment_method: 'cod' | 'qr' | 'bank_transfer';
    bank_transfer_details?: {
      bank_name?: string;
      account_number?: string;
      account_holder?: string;
      transfer_reference?: string;
    };
  }): Promise<any> => {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  // Get orders by status
  byStatus: async (status: 'pending' | 'processing' | 'completed' | 'cancelled', params?: { per_page?: number }): Promise<any> => {
    const queryString = new URLSearchParams();
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());

    return apiRequest(`/orders/status/${status}?${queryString.toString()}`, {
      method: 'GET',
    });
  },

  // Get simple product orders
  simpleProducts: async (params?: { per_page?: number }): Promise<any> => {
    const queryString = new URLSearchParams();
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());

    return apiRequest(`/orders/simple-products?${queryString.toString()}`, {
      method: 'GET',
    });
  },

  // Get variant product orders
  variantProducts: async (params?: { per_page?: number }): Promise<any> => {
    const queryString = new URLSearchParams();
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());

    return apiRequest(`/orders/variant-products?${queryString.toString()}`, {
      method: 'GET',
    });
  },

  // Get download product orders
  downloadProducts: async (params?: { per_page?: number }): Promise<any> => {
    const queryString = new URLSearchParams();
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());

    return apiRequest(`/orders/download-products?${queryString.toString()}`, {
      method: 'GET',
    });
  },

  // Update order status
  updateStatus: async (orderId: number, status: 'pending' | 'processing' | 'completed' | 'cancelled'): Promise<any> => {
    return apiRequest(`/orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
};

// Categories interfaces
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number | null;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: Category;
  children?: Category[];
  full_path?: string;
  depth?: number;
}

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  parent_id?: number | null;
  order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  parent_id?: number | null;
  order?: number;
  is_active?: boolean;
}

// Categories API
export const categories = {
  // Get all categories (public)
  getAll: async (params?: {
    parent_id?: number | string;
    search?: string;
    tree?: boolean;
    all?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<{ success: boolean; data: Category[]; meta?: any }> => {
    const queryString = new URLSearchParams();
    if (params?.parent_id !== undefined) queryString.append('parent_id', params.parent_id.toString());
    if (params?.search) queryString.append('search', params.search);
    if (params?.tree) queryString.append('tree', 'true');
    if (params?.all) queryString.append('all', 'true');
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());
    if (params?.page) queryString.append('page', params.page.toString());

    const query = queryString.toString() ? `?${queryString}` : '';
    return apiRequest(`/categories${query}`);
  },

  // Get a single category by ID
  getById: async (id: number): Promise<{ success: boolean; data: Category }> => {
    return apiRequest(`/categories/${id}`);
  },

  // Get a category by slug
  getBySlug: async (slug: string): Promise<{ success: boolean; data: Category }> => {
    return apiRequest(`/categories/slug/${slug}`);
  },

  // Admin: Get all categories with full details
  adminGetAll: async (params?: {
    parent_id?: number | string;
    search?: string;
    is_active?: boolean;
    tree?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<{ success: boolean; data: Category[]; meta?: any }> => {
    const queryString = new URLSearchParams();
    if (params?.parent_id !== undefined) queryString.append('parent_id', params.parent_id.toString());
    if (params?.search) queryString.append('search', params.search);
    if (params?.is_active !== undefined) queryString.append('is_active', params.is_active.toString());
    if (params?.tree) queryString.append('tree', 'true');
    if (params?.per_page) queryString.append('per_page', params.per_page.toString());
    if (params?.page) queryString.append('page', params.page.toString());

    const query = queryString.toString() ? `?${queryString}` : '';
    return apiRequest(`/admin/categories${query}`);
  },

  // Admin: Create a new category
  create: async (data: CreateCategoryData): Promise<{ success: boolean; message: string; data: Category }> => {
    return apiRequest('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Admin: Update a category
  update: async (id: number, data: UpdateCategoryData): Promise<{ success: boolean; message: string; data: Category }> => {
    return apiRequest(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Admin: Delete a category
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/admin/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Admin: Reorder categories
  reorder: async (categoriesOrder: { id: number; order: number; parent_id?: number | null }[]): Promise<{ success: boolean; message: string }> => {
    return apiRequest('/admin/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ categories: categoriesOrder }),
    });
  },

  // Admin: Generate unique slug from name
  generateSlug: async (name: string, excludeId?: number): Promise<{ success: boolean; slug: string }> => {
    return apiRequest('/admin/categories/generate-slug', {
      method: 'POST',
      body: JSON.stringify({ name, exclude_id: excludeId }),
    });
  },
};

export default {
  auth,
  posts,
  users,
  friends,
  groups,
  groupPosts,
  chat,
  shops,
  shopPosts,
  orders,
  admin,
  categories,
};
