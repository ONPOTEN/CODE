'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { friends, User, ApiException } from '@/lib/api';
import ChatButton from '@/components/ChatButton';

export default function FriendsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unfriendLoading, setUnfriendLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);
        const response = await friends.getAll();
        setFriendsList(response.data);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError('Failed to load friends');
        }
        console.error('Error fetching friends:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [isAuthenticated]);

  const handleUnfriend = async (friendId: number, friendName: string) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy kết bạn với ${friendName}?`
    );

    if (!confirmed) return;

    try {
      setUnfriendLoading(friendId);
      await friends.unfriend(friendId);
      // Remove from list
      setFriendsList((prev) => prev.filter((friend) => friend.id !== friendId));
      alert('Đã hủy kết bạn thành công');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Không thể hủy kết bạn: ${err.message}`);
      } else {
        alert('Không thể hủy kết bạn');
      }
      console.error('Error unfriending:', err);
    } finally {
      setUnfriendLoading(null);
    }
  };

  if (isLoading || loading) {
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

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Bạn bè của tôi
              {friendsList.length > 0 && (
                <span className="text-lg font-normal text-gray-500">
                  ({friendsList.length})
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-2">Quản lý các kết nối và tình bạn của bạn</p>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại hồ sơ
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-grey-200 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Lỗi</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Friends List */}
        <div className="bg-grey-200 rounded-lg shadow-lg border border-gray-300">
          {friendsList.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {friendsList.map((friend) => (
                <div
                  key={friend.id}
                  className="p-6 hover:bg-white transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      <Link href={`/users/${friend.id}`}>
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-gray-900 text-xl font-bold cursor-pointer hover:scale-105 transition-transform">
                          {friend.name?.charAt(0).toUpperCase() || friend.username?.charAt(0).toUpperCase()}
                        </div>
                      </Link>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/users/${friend.id}`}>
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer truncate">
                            {friend.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500 truncate">@{friend.username}</p>
                        <p className="text-xs text-gray-600 mt-1">{friend.email}</p>
                      </div>

                      {/* Friend Since Badge */}
                      <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500 text-green-800 rounded-full text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Bạn bè
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {/* Chat Button */}
                      <ChatButton userId={friend.id} userName={friend.name} />

                      <Link
                        href={`/users/${friend.id}`}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Hồ sơ
                      </Link>

                      <button
                        onClick={() => handleUnfriend(friend.id, friend.name)}
                        disabled={unfriendLoading === friend.id}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                        </svg>
                        {unfriendLoading === friend.id ? 'Đang xóa...' : 'Hủy kết bạn'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Chưa có bạn bè</h2>
              <p className="text-gray-600 mb-6">Bắt đầu xây dựng mạng lưới bằng cách gửi lời mời kết bạn</p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Tìm kiếm người dùng
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
