'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { users, posts, friends, chat, User, Post, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import UserSearchAutocomplete from '@/components/UserSearchAutocomplete';
import { WallPostCard } from '@/components/WallPostCard';
import { ShareToWallModal } from '@/components/ShareToWallModal';
import { CreateWallPostModal } from '@/components/CreateWallPostModal';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const userId = params.id as string;

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching user with ID/username:', userId);

        // Try to fetch by ID first (if it's a number), otherwise fetch by username
        let userData;
        const numericId = parseInt(userId);

        if (!isNaN(numericId) && numericId.toString() === userId) {
          // It's a numeric ID
          console.log('Fetching user by ID:', numericId);
          userData = await users.getById(numericId);
        } else {
          // It's a username
          console.log('Fetching user by username:', userId);
          userData = await users.getByUsername(userId);
        }

        console.log('Fetched user data:', userData);
        if (userData && typeof userData === 'object' && 'data' in userData) {
          userData = (userData as any).data;
        }
        console.log('[UserProfile] is_friend:', userData?.is_friend, 'friend_request_sent:', userData?.friend_request_sent, 'friendship_status:', userData?.friendship_status);
        setUser(userData as any);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`Không thể tải người dùng: ${err.message}`);
        } else {
          setError('Không thể tải người dùng');
        }
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUserWallPosts = async () => {
    if (!user) return;

    try {
      setPostsLoading(true);
      // Fetch posts from the user's wall
      const response = await posts.userWall(user.id, { per_page: 50 });
      setUserPosts(response.data);
    } catch (err) {
      console.error('Error fetching user wall posts:', err);
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserWallPosts();
  }, [user]);

  const handleSendFriendRequest = async () => {
    if (!user) return;

    try {
      setFriendActionLoading(true);
      await friends.sendRequest(user.id);
      // Update local state
      setUser({ ...user, friend_request_sent: true });
      alert('Đã gửi lời mời kết bạn thành công!');
    } catch (err) {
      console.error('Full error object:', err);
      if (err instanceof ApiException) {
        console.error('ApiException details - Status:', err.status, 'Message:', err.message, 'Errors:', err.errors);
        alert(`Gửi lời mời kết bạn thất bại: ${err.message}`);
      } else {
        alert('Gửi lời mời kết bạn thất bại: Đã xảy ra lỗi không mong đợi');
      }
      console.error('Error sending friend request:', err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!user) return;

    try {
      setFriendActionLoading(true);
      await friends.acceptRequest(user.id);
      // Update local state
      setUser({ ...user, is_friend: true, friend_request_received: false });
      alert('Đã chấp nhận lời mời kết bạn!');
    } catch (err) {
      console.error('Full error object:', err);
      if (err instanceof ApiException) {
        console.error('ApiException details - Status:', err.status, 'Message:', err.message, 'Errors:', err.errors);
        alert(`Chấp nhận lời mời kết bạn thất bại: ${err.message}`);
      } else {
        alert('Chấp nhận lời mời kết bạn thất bại: Đã xảy ra lỗi không mong đợi');
      }
      console.error('Error accepting friend request:', err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!user) return;

    try {
      setFriendActionLoading(true);
      await friends.rejectRequest(user.id);
      // Update local state
      setUser({ ...user, friend_request_received: false });
      alert('Đã từ chối lời mời kết bạn');
    } catch (err) {
      console.error('Full error object:', err);
      if (err instanceof ApiException) {
        console.error('ApiException details - Status:', err.status, 'Message:', err.message, 'Errors:', err.errors);
        alert(`Từ chối lời mời kết bạn thất bại: ${err.message}`);
      } else {
        alert('Từ chối lời mời kết bạn thất bại: Đã xảy ra lỗi không mong đợi');
      }
      console.error('Error rejecting friend request:', err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy kết bạn với ${user.name}?`
    );

    if (!confirmed) return;

    try {
      setFriendActionLoading(true);
      await friends.unfriend(user.id);
      // Update local state
      setUser({ ...user, is_friend: false });
      alert('Đã hủy kết bạn thành công');
    } catch (err) {
      console.error('Full error object:', err);
      if (err instanceof ApiException) {
        console.error('ApiException details - Status:', err.status, 'Message:', err.message, 'Errors:', err.errors);
        alert(`Hủy kết bạn thất bại: ${err.message}`);
      } else {
        alert('Hủy kết bạn thất bại: Đã xảy ra lỗi không mong đợi');
      }
      console.error('Error unfriending:', err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  const isOwnProfile = currentUser && currentUser.id === user?.id;

  const handleMessageClick = async () => {
    if (!user) return;

    try {
      setMessageLoading(true);
      // Get or create conversation with this user
      const conversation = await chat.getOrCreateConversation(user.id);
      // Navigate to messages with the room name
      router.push(`/messages?room=${conversation.room_name}`);
    } catch (err) {
      console.error('Error creating conversation:', err);
      // Fallback to simple navigation with user id
      router.push(`/messages?with=${user.id}`);
    } finally {
      setMessageLoading(false);
    }
  };

  // Helper to check if field is public (null is treated as public, only false means private)
  const isPublic = (value: any) => value !== false && value !== 0 && value !== "0" && value !== "false";

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-grey-200 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Lỗi</h2>
            <p className="text-red-700">{error || 'Không tìm thấy người dùng'}</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back Button and Search Bar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Quay lại trang chủ
          </Link>

          {/* User Search Autocomplete */}
          <div className="flex-1 max-w-md">
            <UserSearchAutocomplete placeholder="Tìm kiếm người dùng khác..." />
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-grey-200 rounded-lg shadow-lg p-8 border border-gray-300 mb-8">
          {/* Profile Header */}
          <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-300">
            {/* Avatar */}
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
            />

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
                  <p className="text-gray-600 text-lg mb-1">@{user.username}</p>
                </div>
              </div>

              {/* Friendship Status Badge */}
              {!isOwnProfile && user.is_friend && (
                <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-green-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bạn bè
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && currentUser && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full mb-8">
              {/* Message Button */}
              <button
                onClick={handleMessageClick}
                disabled={messageLoading}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {messageLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                <span>{messageLoading ? 'Đang tải...' : 'Nhắn tin'}</span>
              </button>
              {/* Dynamic Friend Button */}
              {user.is_friend ? (
                <button
                  type="button"
                  onClick={handleUnfriend}
                  disabled={friendActionLoading}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {friendActionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                    </svg>
                  )}
                  <span>{friendActionLoading ? 'Đang xử lý...' : 'Hủy kết bạn'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendFriendRequest}
                  disabled={friendActionLoading || user.friend_request_sent}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                    user.friend_request_sent
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-700 text-white'
                  }`}
                >
                  {friendActionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  )}
                  <span>{friendActionLoading ? 'Đang gửi...' : user.friend_request_sent ? 'Đang chờ' : 'Thêm bạn'}</span>
                </button>
              )}
              {/* Post on Wall Button */}
              <button
                onClick={() => setShowShareModal(true)}
                disabled={friendActionLoading}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden sm:inline">Đăng lên tường</span>
                <span className="sm:hidden">Đăng</span>
              </button>
              {/* Create New Post on Wall Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={friendActionLoading}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Tạo bài viết</span>
                <span className="sm:hidden">Tạo</span>
              </button>
            </div>
          )}

          {/* User Details */}
          <div className="space-y-1">
            <div className="grid md:grid-cols-2 gap-2">
              {/* Email - always show */}
              <div className="bg-white p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-700 text-sm">Email: {user.email}</span>
                </div>
                
              </div>

              {/* Member Since - always show */}
              <div className="bg-white p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-700 text-sm">Thành viên từ: {new Date(user.created_at).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}</span>
                </div>
                
              </div>

              {/* Phone - show if public */}
              {isPublic((user as any).phone_public) && (user as any).phone && (
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Điện thoại: {(user as any).phone}</span>
                  </div>
                  
                </div>
              )}

              {/* Location - show if public */}
              {isPublic((user as any).location_public) && (user as any).location && (
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Địa điểm: {(user as any).location}</span>
                  </div>
                  
                </div>
              )}

              {/* Company - show if public */}
              {isPublic((user as any).company_public) && (user as any).company && (
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Công ty: {(user as any).company}</span>
                  </div>
                 
                </div>
              )}

              {/* Occupation - show if public */}
              {isPublic((user as any).occupation_public) && (user as any).occupation && (
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Nghề nghiệp: {(user as any).occupation}</span>
                  </div>
                  
                </div>
              )}

              {/* Main Occupation - show if public */}
              {isPublic((user as any).main_occupation_public) && (user as any).main_occupation && (
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Nghề nghiệp chính: {(user as any).main_occupation}</span>
                  </div>
                  
                </div>
              )}

              {/* Hobby - show if public */}
              {isPublic((user as any).hobby_public) && (user as any).hobby && (
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Sở thích: {(user as any).hobby}</span>
                  </div>
                  
                </div>
              )}

              {/* Bio - show if public */}
              {isPublic((user as any).bio_public) && (user as any).bio && (
                <div className="bg-white p-3 rounded-lg md:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Tiểu sử: {(user as any).bio}</span>
                  </div>
                  
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Wall Posts Section */}
        <div className="bg-grey-200 rounded-lg shadow-lg p-8 border border-gray-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Tường của {user.name}
          </h2>
          <p className="text-gray-600 mb-6 text-sm">Bài viết được chia sẻ lên tường của {user.name}</p>

          {postsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : userPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userPosts.map((post) => (
                <WallPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">Không có bài viết trên tường</p>
              <p className="text-sm mt-1">Chưa có bài viết nào được chia sẻ lên tường của {user.name}.</p>
            </div>
          )}
        </div>

        {/* Share to Wall Modal */}
        <ShareToWallModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          wallUserId={user.id}
          wallUserName={user.name}
          onSuccess={() => {
            // Refresh the wall posts
            fetchUserWallPosts();
          }}
        />

        {/* Create Post on Wall Modal */}
        <CreateWallPostModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          wallUserId={user.id}
          wallUserName={user.name}
          currentUser={currentUser as any}
          onSuccess={() => {
            // Refresh the wall posts
            fetchUserWallPosts();
          }}
        />
      </div>
    </div>
  );
}
