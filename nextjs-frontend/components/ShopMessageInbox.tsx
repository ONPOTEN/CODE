'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import ShopChatRoom from './ShopChatRoom';

interface InboxMessage {
  id: string;
  shopId: number;
  shopName: string;
  shopOwnerId: number;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
}

interface ShopMessageInboxProps {
  shopId: number;
  shopName: string;
  shopOwnerId: number;
  isOwner: boolean;
}

export default function ShopMessageInbox({
  shopId,
  shopName,
  shopOwnerId,
  isOwner,
}: ShopMessageInboxProps) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);

  // Only show for customers (non-owners)
  if (isOwner || !user) {
    return null;
  }

  // Room name format: "{userid}-shop{shopid}"
  const roomName = `${user.id}-shop${shopId}`;

  // Join shop message room to receive replies
  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    console.log('[ShopMessageInbox] Joining room:', roomName);

    socket.emit('join:shop:room', {
      userId: user.id,
      shopId: shopId,
      roomName: roomName,
    });

    const handleShopMessage = (data: any) => {
      console.log('[ShopMessageInbox] Received shop message:', data);

      if (data.shopId === shopId && data.userId !== user.id) {
        // Message from shop owner (reply)
        console.log('[ShopMessageInbox] Message is a reply from shop owner');

        setMessages((prev) => {
          const existing = prev.find((m) => m.shopId === shopId);
          const newMessage: InboxMessage = {
            id: `${Date.now()}-${Math.random()}`,
            shopId: data.shopId,
            shopName: data.shopName,
            shopOwnerId: data.userId,
            lastMessage: data.message,
            lastMessageTime: data.timestamp || new Date().toISOString(),
            unread: true,
          };

          if (existing) {
            // Update existing conversation
            return prev.map((m) =>
              m.shopId === shopId ? { ...m, ...newMessage } : m
            );
          } else {
            // Add new conversation
            return [newMessage, ...prev];
          }
        });

        setHasUnread(true);
      }
    };

    socket.on('shop:message', handleShopMessage);
    setRoomJoined(true);

    return () => {
      console.log('[ShopMessageInbox] Leaving room:', roomName);
      socket.off('shop:message', handleShopMessage);
      socket.emit('leave:shop:room', {
        userId: user.id,
        shopId: shopId,
        roomName: roomName,
      });
      setRoomJoined(false);
    };
  }, [socket, user, shopId, roomName]);

  const handleOpenChat = () => {
    setIsChatOpen(true);
    // Mark as read
    setMessages((prev) =>
      prev.map((m) => (m.shopId === shopId ? { ...m, unread: false } : m))
    );
    setHasUnread(false);
  };

  return (
    <>
      {/* Message Badge Button */}
      <button
        onClick={handleOpenChat}
        className="relative inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-gray-900 rounded-lg font-medium transition-colors h-fit whitespace-nowrap"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        Tin nhắn
        {hasUnread && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-gray-900 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {messages.filter((m) => m.unread).length}
          </span>
        )}
      </button>

      {/* Empty State - No Messages Yet */}
      {messages.length === 0 && !hasUnread && (
        <div className="mt-2 text-xs text-gray-500">
          <p>Chưa có tin nhắn nào từ chủ cửa hàng</p>
        </div>
      )}

      {/* Chat Room Modal */}
      <ShopChatRoom
        shopId={shopId}
        shopName={shopName}
        shopOwnerId={shopOwnerId}
        isOwner={isOwner}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </>
  );
}
