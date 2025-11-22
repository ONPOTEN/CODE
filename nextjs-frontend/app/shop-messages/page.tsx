'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { shops, apiRequest, tokenStorage } from '@/lib/api';

interface ShopMessage {
  id: number;
  shop_id: number;
  sender_id: number;
  shop_owner_id: number;
  message: string;
  status: 'sent' | 'delivered' | 'read';
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender?: {
    id: number;
    display_name?: string;
    name?: string;
  };
}

interface ShopMessageStats {
  shopId: number;
  shopName: string;
  unreadCount: number;
  totalMessages: number;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSender?: string;
}

export default function ShopMessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const [messageStats, setMessageStats] = useState<ShopMessageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    fetchMessageStats();
  }, [isAuthenticated, user]);

  const fetchMessageStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user's shops
      const myShopsResponse = await shops.myShops();
      const myShops = myShopsResponse.data || [];

      console.log('[ShopMessages] User shops:', myShops);

      // Fetch messages and stats for each shop
      const statsPromises = myShops.map(async (shop: any) => {
        try {
          // Fetch unread count
          const unreadResponse = await fetch(
            `/api/v1/shops/${shop.id}/messages/unread-count`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          const unreadData = await unreadResponse.json();
          const unreadCount = unreadData.unread_count || 0;

          // Fetch all messages to get total count and last message
          const messagesResponse = await fetch(
            `/api/v1/shops/${shop.id}/messages?per_page=1&sort=-created_at`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          if (!messagesResponse.ok) {
            console.warn(`Failed to fetch messages for shop ${shop.id}`);
            return {
              shopId: shop.id,
              shopName: shop.name,
              unreadCount,
              totalMessages: 0,
            };
          }

          const messagesData = await messagesResponse.json();
          const messages = messagesData.data || [];
          const meta = messagesData.meta || { total: 0 };

          let lastMessage = '';
          let lastMessageTime = '';
          let lastMessageSender = '';

          if (messages.length > 0) {
            const msg = messages[0];
            lastMessage = msg.message?.substring(0, 50) || '';
            if (lastMessage.length === 50) lastMessage += '...';
            lastMessageTime = msg.created_at || '';
            lastMessageSender = msg.sender?.display_name || msg.sender?.name || 'Customer';
          }

          return {
            shopId: shop.id,
            shopName: shop.name,
            unreadCount,
            totalMessages: meta.total || 0,
            lastMessage,
            lastMessageTime,
            lastMessageSender,
          };
        } catch (err) {
          console.error(`Error fetching stats for shop ${shop.id}:`, err);
          return {
            shopId: shop.id,
            shopName: shop.name,
            unreadCount: 0,
            totalMessages: 0,
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      // Show all shops, even without messages (or just those with messages)
      const sortedStats = stats.sort((a, b) => b.unreadCount - a.unreadCount);
      setMessageStats(sortedStats);

      if (sortedStats.length === 0) {
        console.log('[ShopMessages] No shops found');
      }
    } catch (err) {
      console.error('[ShopMessages] Error fetching stats:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load message statistics'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Login Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in to view your shop messages
          </p>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your shop messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4v2m0 4v2M12 3c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 3 12 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchMessageStats}
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Shop Messages
              </h1>
              <p className="text-gray-600 mt-2">
                Manage customer messages for your shops
              </p>
            </div>
            <Link
              href="/my-shops"
              className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
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
              Back to My Shops
            </Link>
          </div>
        </div>

        {/* Messages Grid */}
        {messageStats.length === 0 ? (
          <div className="bg-grey-200 rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500 font-medium mb-2">
              No messages yet
            </p>
            <p className="text-gray-600 text-sm mb-6">
              When customers send messages to your shops, they will appear here
            </p>
            <Link
              href="/my-shops"
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Shops
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {messageStats.map((stat) => (
              <Link
                key={stat.shopId}
                href={`/shop-messages/${stat.shopId}`}
                className="bg-grey-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  {/* Unread Badge */}
                  {stat.unreadCount > 0 && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-bold text-gray-900 bg-grey-2000 rounded-full">
                        {stat.unreadCount} New
                      </span>
                    </div>
                  )}

                  {/* Shop Icon */}
                  <div className="mb-4">
                    <svg
                      className="w-12 h-12 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>

                  {/* Shop Name */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                    {stat.shopName}
                  </h3>

                  {/* Stats */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>
                      <span className="font-medium text-red-600">
                        {stat.unreadCount}
                      </span>{' '}
                      unread message
                      {stat.unreadCount !== 1 ? 's' : ''}
                    </p>
                    <p>
                      <span className="font-medium text-blue-600">
                        {stat.totalMessages}
                      </span>{' '}
                      total message
                      {stat.totalMessages !== 1 ? 's' : ''}
                    </p>

                    {/* Last Message */}
                    {stat.lastMessage && (
                      <div className="pt-2 border-t border-gray-300 mt-2">
                        <p className="text-xs text-gray-500 font-medium">Latest Message</p>
                        <p className="text-xs text-gray-700 italic mt-1 line-clamp-2">
                          "{stat.lastMessage}"
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          from {stat.lastMessageSender}
                        </p>
                        {stat.lastMessageTime && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            {new Date(stat.lastMessageTime).toLocaleDateString()} at{' '}
                            {new Date(stat.lastMessageTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    View Messages
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
