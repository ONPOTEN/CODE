'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface ShopMessage {
  id: string;
  shopId: number;
  shopName: string;
  userId: number;
  userName: string;
  message: string;
  roomName: string;
  timestamp: string;
  isRead?: boolean;
}

interface ShopMessagesSectionProps {
  shopId: number;
  isOwner: boolean;
}

export default function ShopMessagesSection({ shopId, isOwner }: ShopMessagesSectionProps) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ShopMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [roomJoined, setRoomJoined] = useState(false);

  // Join the shop room and listen for messages
  useEffect(() => {
    if (!socket || !isOwner || !user) {
      console.log('[ShopMessages] Skipping setup:', { hasSocket: !!socket, isOwner, hasUser: !!user });
      return;
    }

    // Room name format: "{userid}-shop{shopid}"
    const roomName = `${user.id}-shop${shopId}`;
    console.log('[ShopMessages] Setting up socket listener for room:', roomName);

    // Join the room
    socket.emit('join:shop:room', {
      userId: user.id,
      shopId: shopId,
      roomName: roomName,
    });
    console.log('[ShopMessages] Emitted join:shop:room with roomName:', roomName);

    const handleShopMessage = (data: any) => {
      console.log('[ShopMessages] Received shop:message event:', data);

      if (data.shopId === shopId) {
        const newMessage: ShopMessage = {
          id: `${Date.now()}-${Math.random()}`,
          shopId: data.shopId,
          shopName: data.shopName,
          userId: data.userId,
          userName: data.userName,
          message: data.message,
          roomName: data.roomName,
          timestamp: data.timestamp || new Date().toISOString(),
          isRead: false,
        };

        console.log('[ShopMessages] Adding new message to state:', newMessage);
        setMessages((prevMessages) => [newMessage, ...prevMessages]);
      }
    };

    // Listen for messages in this shop's room
    socket.on('shop:message', handleShopMessage);
    setRoomJoined(true);

    return () => {
      console.log('[ShopMessages] Cleaning up socket listener');
      socket.off('shop:message', handleShopMessage);
      // Leave the room
      socket.emit('leave:shop:room', {
        userId: user.id,
        shopId: shopId,
        roomName: roomName,
      });
      setRoomJoined(false);
    };
  }, [socket, shopId, isOwner, user]);

  if (!isOwner) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Shop Messages
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Messages from customers interested in your shop
          </p>
        </div>
        {messages.length > 0 && (
          <div className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 font-semibold text-sm">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </div>
        )}
      </div>

      {/* Connection Status & Room Info */}
      <div className="mb-4 space-y-2">
        {/* Room Info */}
        {user && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
            <p className="text-blue-900 font-mono">
              📍 Listening on room: <span className="font-bold">{user.id}-shop{shopId}</span>
            </p>
            <p className="text-blue-800 mt-1">
              {isConnected ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Connected to Socket.IO
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Disconnected from Socket.IO
                </span>
              )}
            </p>
          </div>
        )}

        {/* Warning if not connected */}
        {!isConnected && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Not connected to Socket.IO</p>
              <p className="text-xs text-yellow-700">Real-time messages will not be received until connection is restored</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="text-center py-12">
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
          <p className="text-gray-500 font-medium mb-1">No messages yet</p>
          <p className="text-gray-400 text-sm">Messages from customers will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
            >
              {/* Message Header */}
              <button
                onClick={() =>
                  setExpandedMessageId(expandedMessageId === msg.id ? null : msg.id)
                }
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-start justify-between gap-4"
              >
                {/* Sender Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1 text-left">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{msg.userName}</p>
                    <p className="text-xs text-gray-600">{formatDate(msg.timestamp)}</p>
                  </div>
                </div>

                {/* Expand Icon */}
                <svg
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                    expandedMessageId === msg.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {/* Message Content */}
              {expandedMessageId === msg.id && (
                <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                  {/* Message Text */}
                  <div>
                    <p className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                      {msg.message}
                    </p>
                  </div>

                  {/* Message Meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-xs text-gray-600">
                    <span>
                      {new Date(msg.timestamp).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.roomName && (
                      <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                        Room: {msg.roomName}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() => {
                        // Copy message to clipboard
                        navigator.clipboard.writeText(msg.message);
                        alert('Message copied to clipboard');
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        // Reply functionality
                        alert('Reply feature coming soon!');
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h10a4 4 0 014 4v7m-4-10l-4-4m4 4l4-4"
                        />
                      </svg>
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      {messages.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            Messages are stored in real-time. Refresh to see all messages sent while you were away.
          </p>
        </div>
      )}
    </div>
  );
}
