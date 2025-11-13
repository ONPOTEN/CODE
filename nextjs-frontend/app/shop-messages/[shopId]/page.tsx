'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';

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

interface ShopInfo {
  id: number;
  name: string;
  logo?: string;
}

export default function ShopMessagesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { socket, onShopMessage, offShopMessage } = useSocket();
  const shopId = Number(params.shopId);

  const [messages, setMessages] = useState<ShopMessage[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    fetchMessages();
  }, [shopId, page, isAuthenticated]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = `/shops/${shopId}/messages?per_page=20&page=${page}`;
      console.log('[ShopMessagesDetail] Fetching from:', endpoint);

      const data = await apiRequest<{
        data: ShopMessage[];
        meta: { last_page: number };
      }>(endpoint);

      console.log('[ShopMessagesDetail] Fetched data:', data);

      setMessages(data.data || []);

      // Extract shop info from first message or use default
      if (data.data && data.data.length > 0 && !shopInfo) {
        const firstMsg = data.data[0];
        if (firstMsg.shop) {
          setShopInfo({
            id: firstMsg.shop.id,
            name: firstMsg.shop.name,
            logo: firstMsg.shop.logo,
          });
        }
      }

      // Set pagination
      if (data.meta) {
        setTotalPages(data.meta.last_page || 1);
      }
    } catch (err) {
      console.error('[ShopMessagesDetail] Error fetching messages:', err);

      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          setError('Authentication failed. Please log in again.');
          router.push('/login');
        } else if (err.message.includes('403')) {
          setError('You do not have permission to view these messages');
        } else if (err.message.includes('404')) {
          setError('Shop not found');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      const endpoint = `/shops/${shopId}/messages/${messageId}/read`;
      await apiRequest(endpoint, {
        method: 'PUT',
      });

      // Update message in local state
      setMessages(messages.map(msg =>
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  const handleReply = async (message: ShopMessage) => {
    if (!socket || !user) return;

    try {
      // For shop owner: join customer chat room and navigate to messages
      if (user.id === message.shop_owner_id) {
        const roomName = `${message.sender_id}-shop${shopId}`;
        console.log('[ShopMessagesDetail] Shop owner joining reply chat room:', roomName);

        // Emit join event to socket server to join the chat room
        socket.emit('join:chat:room', {
          userId: user.id,
          roomName: roomName,
        });

        // Navigate to messages page with customer ID and shop ID
        // This allows the messages page to join the proper shop message room
        router.push(`/messages?with=${message.sender_id}&shopId=${shopId}`);
      } else {
        // For customers: stay on shop messages page or scroll to reply area
        // (You can add a comment form here in the future)
        console.log('[ShopMessagesDetail] Customer clicked reply - staying on shop messages');
        // Could add a reply form modal here in future
      }
    } catch (err) {
      console.error('Error handling reply:', err);
    }
  };

  // Listen for real-time shop messages
  useEffect(() => {
    if (!socket || !user || !isAuthenticated) return;

    const handleNewShopMessage = async (message: any) => {
      console.log('[ShopMessagesDetail] Received new shop message:', message);

      // Only add message if it's for this shop
      if (message.shopId === shopId) {
        console.log('[ShopMessagesDetail] Adding new message to list for shop:', shopId);

        // Create a ShopMessage object from the Socket.IO event
        const newMessage: ShopMessage = {
          id: message.id || Date.now(), // Use timestamp as fallback ID
          shop_id: message.shopId,
          sender_id: message.userId,
          shop_owner_id: message.shopOwnerId,
          message: message.message,
          status: 'sent',
          is_read: false,
          created_at: message.timestamp || new Date().toISOString(),
          updated_at: message.timestamp || new Date().toISOString(),
          sender: {
            id: message.userId,
            display_name: message.userName,
            name: message.userName,
          },
        };

        console.log('[ShopMessagesDetail] New message object:', newMessage);

        // Save message to backend asynchronously (non-blocking)
        // This ensures message persistence even if Node.js server save fails
        const saveMessageToDB = async () => {
          try {
            // Wait a bit to see if Node.js server has already saved it
            await new Promise((resolve) => setTimeout(resolve, 500));

            console.log('[ShopMessagesDetail] Attempting to save message to backend for shop:', shopId);
            console.log('[ShopMessagesDetail] Message payload:', {
              shop_id: message.shopId,
              sender_id: message.userId,
              shop_owner_id: message.shopOwnerId,
              message: message.message,
            });

            const response = await apiRequest<{ message: string; data: ShopMessage }>(
              `/shops/${shopId}/messages`,
              {
                method: 'POST',
                body: JSON.stringify({
                  shop_id: message.shopId,
                  sender_id: message.userId,
                  shop_owner_id: message.shopOwnerId,
                  message: message.message,
                }),
              }
            );

            if (response.data) {
              console.log('[ShopMessagesDetail] ✅ Message saved to backend successfully:', response.data.id);
              // Update the message in the list with the proper ID from backend
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === newMessage.id && msg.id === Date.now()
                    ? {
                        ...msg,
                        id: response.data.id,
                        created_at: response.data.created_at || msg.created_at,
                        updated_at: response.data.updated_at || msg.updated_at
                      }
                    : msg
                )
              );
            }
          } catch (err) {
            console.error('[ShopMessagesDetail] ❌ Error saving message to backend:', err);
            // Message still displays in UI - this is a fallback mechanism
          }
        };

        // Start the save in background (don't await it)
        saveMessageToDB();

        // Add new message to the top of the list
        setMessages((prevMessages) => {
          // Check if message already exists to avoid duplicates
          const exists = prevMessages.some((m) => m.id === newMessage.id);
          if (exists) {
            console.log('[ShopMessagesDetail] Message already exists, skipping duplicate');
            return prevMessages;
          }

          return [newMessage, ...prevMessages];
        });

        // Increment total pages if this is the first page
        if (page === 1) {
          setTotalPages((prev) => prev);
        }
      }
    };

    console.log('[ShopMessagesDetail] Attaching shop:message listener for shop:', shopId);
    onShopMessage(handleNewShopMessage);

    return () => {
      console.log('[ShopMessagesDetail] Removing shop:message listener for shop:', shopId);
      offShopMessage(handleNewShopMessage);
    };
  }, [socket, shopId, user, isAuthenticated, page, onShopMessage, offShopMessage]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view messages</p>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/shop-messages"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
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
                {shopInfo ? shopInfo.name : `Shop ${shopId}`} Messages
              </h1>
            </div>
            <Link
              href="/shop-messages"
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
              Back to All Messages
            </Link>
          </div>
        </div>

        {/* Messages List */}
        {messages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
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
            <p className="text-gray-500 font-medium mb-2">No messages</p>
            <p className="text-gray-400 text-sm">
              There are no messages for this shop yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
                  msg.is_read ? 'border-gray-300' : 'border-blue-500'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {msg.sender?.display_name || msg.sender?.name || `Customer #${msg.sender_id}`}
                      </h3>
                      {!msg.is_read && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-bold text-white bg-blue-500 rounded">
                          New
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                          msg.status === 'read'
                            ? 'bg-green-100 text-green-800'
                            : msg.status === 'delivered'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(msg.created_at).toLocaleDateString()} at{' '}
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {!msg.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(msg.id)}
                      className="ml-4 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>

                {/* Message Content */}
                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                  <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
                    {msg.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <span>Message ID: {msg.id}</span>
                    {msg.read_at && (
                      <span className="ml-4">Read on {new Date(msg.read_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleReply(msg)}
                    className="ml-4 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6-6m-6 6l-6-6"
                      />
                    </svg>
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    page === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
