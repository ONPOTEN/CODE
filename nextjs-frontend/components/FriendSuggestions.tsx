'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { users, friends, User, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function FriendSuggestions({ page = 1 }: { page?: number }) {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        // Fetch users using the page parameter
        const response = await users.getAll({ page, per_page: 8 });
        
        // Filter out current user and users who are already friends
        const filtered = (response.data || []).filter(
          u => u.id !== currentUser?.id && !u.is_friend
        );
        
        setSuggestions(filtered);
      } catch (err) {
        console.error('Failed to fetch friend suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchSuggestions();
    } else {
      setLoading(false);
    }
  }, [page, currentUser]);

  const handleAddFriend = async (userId: number, index: number) => {
    try {
      await friends.sendRequest(userId);
      // Optimistically update UI
      setSuggestions(prev => {
        const newSuggestions = [...prev];
        if (newSuggestions[index]) {
          newSuggestions[index] = { ...newSuggestions[index], friend_request_sent: true };
        }
        return newSuggestions;
      });
    } catch (err) {
      if (err instanceof ApiException && err.message.includes('already friends')) {
        setSuggestions(prev => {
          const newSuggestions = [...prev];
          if (newSuggestions[index]) {
            newSuggestions[index] = { ...newSuggestions[index], is_friend: true };
          }
          return newSuggestions;
        });
      } else {
        alert('Không thể gửi lời mời kết bạn');
      }
    }
  };

  if (loading && suggestions.length === 0) {
    return null;
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white border-y md:border border-gray-200 md:rounded-xl my-4 md:my-6 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Gợi ý kết bạn</h3>
        <Link href="/friends" className="text-blue-600 text-sm hover:underline font-medium">
          Xem tất cả
        </Link>
      </div>
      <div className="flex overflow-x-auto px-4 gap-3 pb-5 pt-1 snap-x hide-scrollbar">
        {suggestions.map((user, idx) => (
          <div key={user.id} className="min-w-[140px] w-[140px] md:min-w-[160px] md:w-[160px] flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden shadow-sm snap-start flex flex-col bg-white">
            <Link href={`/users/${user.id}`}>
              <div className="h-36 md:h-40 bg-gray-100 w-full">
                <img 
                  src={user.avatar || user.avatar_url || '/default-avatar.png'} 
                  alt={user.name || user.username} 
                  className="w-full h-full object-cover" 
                />
              </div>
            </Link>
            <div className="p-2.5 flex flex-col flex-1">
              <Link href={`/users/${user.id}`} className="font-semibold text-sm md:text-base text-gray-900 line-clamp-1 mb-2 hover:underline">
                {user.name || user.username}
              </Link>
              <div className="mt-auto">
                {user.is_friend ? (
                  <button disabled className="w-full py-1.5 md:py-2 bg-gray-100 text-gray-500 rounded-md text-sm font-semibold">
                    Bạn bè
                  </button>
                ) : user.friend_request_sent ? (
                  <button disabled className="w-full py-1.5 md:py-2 bg-gray-100 text-gray-500 rounded-md text-sm font-semibold">
                    Đã gửi yêu cầu
                  </button>
                ) : (
                  <button 
                    onClick={() => handleAddFriend(user.id, idx)}
                    className="w-full py-1.5 md:py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-semibold transition-colors"
                  >
                    Thêm bạn bè
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
