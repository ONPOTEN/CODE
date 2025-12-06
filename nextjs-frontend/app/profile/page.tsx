'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import UserSearchAutocomplete from '@/components/UserSearchAutocomplete';
import { friends, FriendRequest, users } from '@/lib/api';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch fresh user profile data from API
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && isAuthenticated) {
        try {
          setProfileLoading(true);
          const response = await users.getById(user.id);
          // Extract data from response if it's wrapped in a data object
          const userData = response && typeof response === 'object' && 'data' in response
            ? response.data
            : response;
          setProfileData(userData);
        } catch (error) {
          console.error('[Profile] Error fetching user profile:', error);
          // Fall back to using cached user data
          setProfileData(user);
        } finally {
          setProfileLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user, isAuthenticated]);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!isAuthenticated || !user) return;

      try {
        setRequestsLoading(true);
        const response = await friends.getPendingRequests();
        console.log(response.data);
        setPendingRequests(response.data);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchPendingRequests();
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleAcceptRequest = async (requestId: number, senderId: number) => {
    try {
      setActionLoading(senderId);
      await friends.acceptRequest(senderId);
      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
      alert('Đã chấp nhận lời mời kết bạn!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Không thể chấp nhận lời mời kết bạn');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: number, senderId: number) => {
    try {
      setActionLoading(senderId);
      await friends.rejectRequest(senderId);
      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
      alert('Đã từ chối lời mời kết bạn');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('Không thể từ chối lời mời kết bạn');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || profileLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user || !profileData) {
    return null;
  }

  // Use profileData for display (has fresh data from API)
  const displayUser = profileData;
  console.log(displayUser);

  // Helper function to check if a field is public (handles true, 1, "1", "true", null)
  // null is treated as public (default)
  const isPublic = (value: any) => value === null || value === true || value === 1 || value === "1" || value === "true";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Hồ sơ</h1>

        <div className="bg-grey-200 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Thông tin người dùng</h2>

          {/* Avatar Display */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-300">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-500 border-2 border-gray-300">
              {displayUser.avatar || displayUser.avatar_url ? (
                <img
                  src={displayUser.avatar || displayUser.avatar_url}
                  alt="User avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-gray-900 text-3xl font-bold">
                  {displayUser.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{displayUser.display_name}</h3>
              <p className="text-gray-600">@{displayUser.username}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Tên hiển thị:</span>
              <span className="ml-2 text-gray-900">{displayUser.display_name}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Tên đăng nhập:</span>
              <span className="ml-2 text-gray-900">{displayUser.username}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <span className="ml-2 text-gray-900">{displayUser.email}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isPublic(displayUser.email_public) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                {isPublic(displayUser.email_public) ? 'Công khai' : 'Riêng tư'}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">ID người dùng:</span>
              <span className="ml-2 text-gray-900">{displayUser.id}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Sở thích:</span>
              <span className="ml-2 text-gray-900">{displayUser.hobby || 'Chưa xác định'}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isPublic(displayUser.hobby_public) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                {isPublic(displayUser.hobby_public) ? 'Công khai' : 'Riêng tư'}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Công ty:</span>
              <span className="ml-2 text-gray-900">{displayUser.company || 'Chưa xác định'}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isPublic(displayUser.company_public) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                {isPublic(displayUser.company_public) ? 'Công khai' : 'Riêng tư'}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Nghề nghiệp:</span>
              <span className="ml-2 text-gray-900">{displayUser.occupation || 'Chưa xác định'}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isPublic(displayUser.occupation_public) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                {isPublic(displayUser.occupation_public) ? 'Công khai' : 'Riêng tư'}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Nghề nghiệp chính:</span>
              <span className="ml-2 text-gray-900">{displayUser.main_occupation || 'Chưa xác định'}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isPublic(displayUser.main_occupation_public) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                {isPublic(displayUser.main_occupation_public) ? 'Công khai' : 'Riêng tư'}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Địa chỉ:</span>
              <span className="ml-2 text-gray-900">{displayUser.location || 'Chưa xác định'}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isPublic(displayUser.location_public) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                {isPublic(displayUser.location_public) ? 'Công khai' : 'Riêng tư'}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Điện thoại:</span>
              <span className="ml-2 text-gray-900">{displayUser.phone || 'Chưa xác định'}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isPublic(displayUser.phone_public) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                {isPublic(displayUser.phone_public) ? 'Công khai' : 'Riêng tư'}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Vai trò:</span>
              <span className="ml-2 text-gray-900 capitalize">{displayUser.role || 'user'}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Hiển thị hồ sơ:</span>
              <span className={`ml-2 font-medium ${displayUser.profile_visibility === 'private' ? 'text-orange-600' : 'text-green-600'}`}>
                {displayUser.profile_visibility === 'private' ? (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Riêng tư
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Công khai
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-grey-200 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-medium">
            ✓ Xác thực thành công với Laravel API
          </p>
          <p className="text-green-700 text-sm mt-1">
            Token xác thực của bạn đã được lưu trữ và sẽ được gửi với tất cả các yêu cầu API.
          </p>
        </div>

        <div className="bg-grey-200 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-blue-900 font-semibold mb-3">Hành động</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/profile/edit"
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Chỉnh sửa hồ sơ
            </Link>
            <Link
              href="/my-posts"
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Bài viết của tôi
            </Link>
            <Link
              href="/posts/create"
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Tạo bài viết mới
            </Link>
            <Link
              href="/friends"
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Bạn bè của tôi
            </Link>
          </div>
        </div>

        <div className="bg-grey-200 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Tìm kiếm người dùng</h3>
          <UserSearchAutocomplete placeholder="Tìm kiếm người dùng khác..." />
        </div>

        {/* Pending Friend Requests */}
        <div className="bg-grey-200 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Lời mời kết bạn
            {pendingRequests.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-gray-900 bg-blue-500 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </h3>

          {requestsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((prequest) => (
                <div
                  key={prequest.id}
                  className="flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Avatar */}
                    <Link href={`/users/${prequest.sender_id}`}>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-gray-900 font-semibold cursor-pointer hover:scale-105 transition-transform">
                        {prequest.sender?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </Link>

                    {/* User Info */}
                    <div className="flex-1">
                      <Link href={`/users/${prequest.sender_id}`}>
                        <p className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                          {prequest.sender?.name || 'Người dùng không xác định'}
                        </p>
                      </Link>
                      <p className="text-sm text-gray-500">@{prequest.sender?.username}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(prequest.created_at).toLocaleDateString('vi-VN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(prequest.id, prequest.sender_id)}
                      disabled={actionLoading === prequest.sender_id}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {actionLoading === prequest.sender_id ? 'Đang xử lý...' : 'Chấp nhận'}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(prequest.id, prequest.sender_id)}
                      disabled={actionLoading === prequest.sender_id}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {actionLoading === prequest.sender_id ? 'Đang xử lý...' : 'Từ chối'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg font-medium">Không có lời mời kết bạn</p>
              <p className="text-sm mt-1">Khi ai đó gửi lời mời kết bạn cho bạn, nó sẽ xuất hiện ở đây.</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
