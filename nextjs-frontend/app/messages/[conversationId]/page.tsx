'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { chat, Conversation } from '@/lib/api';
import ChatWindow from '@/components/chat/ChatWindow';
import { useSocket } from '@/contexts/SocketContext';
import Link from 'next/link';

export default function ConversationDetailPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conversationId = parseInt(params.conversationId as string, 10);
  const { onNewMessage, offNewMessage } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && conversationId) {
      loadConversation();
    }
  }, [isAuthenticated, conversationId]);

  // Listen for incoming messages
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      if (message.conversation_id === conversationId || message.room_name === conversation?.room_name) {
        // Update conversation with new message
        if (conversation) {
          setConversation({
            ...conversation,
            last_message: {
              message: message.message,
              created_at: message.created_at,
              is_mine: message.sender?.id === user?.id,
            },
          });
        }
      }
    };

    onNewMessage(handleNewMessage);
    return () => {
      offNewMessage(handleNewMessage);
    };
  }, [onNewMessage, offNewMessage, user, conversationId, conversation]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const data = await chat.getConversations();

      // Find the conversation by ID
      const found = data.find(c => c.id === conversationId);

      if (found) {
        setConversation(found);
      } else if (conversationId === -1) {
        // Special case for shop room
        let lastMessage: any = undefined;
        try {
          const shopMessagesData = await chat.getShopMessagesByRoomName('656-shop1');
          if (shopMessagesData.messages && Array.isArray(shopMessagesData.messages) && shopMessagesData.messages.length > 0) {
            const lastMsg = shopMessagesData.messages[shopMessagesData.messages.length - 1];
            lastMessage = {
              message: lastMsg.message,
              created_at: lastMsg.created_at,
              is_mine: lastMsg.sender?.id === user?.id,
            };
          }
        } catch (error) {
          console.warn('Failed to fetch shop messages:', error);
        }

        const SHOP_OWNER_ID = 625;
        const CUSTOMER_ID = 656;
        const isCurrentUserShopOwner = user?.id === SHOP_OWNER_ID;
        const otherUserId = isCurrentUserShopOwner ? CUSTOMER_ID : SHOP_OWNER_ID;
        const otherUserName = isCurrentUserShopOwner ? `Customer #${CUSTOMER_ID}` : `Shop Owner #${SHOP_OWNER_ID}`;
        const otherUserEmail = isCurrentUserShopOwner ? `customer${CUSTOMER_ID}@example.com` : `owner${SHOP_OWNER_ID}@example.com`;

        const shopRoom: Conversation = {
          id: -1,
          room_name: '656-shop1',
          other_user: {
            id: otherUserId,
            name: otherUserName,
            email: otherUserEmail,
          },
          last_message: lastMessage,
          unread_count: 0,
          updated_at: new Date().toISOString(),
          shop_owner_id: SHOP_OWNER_ID,
        };

        setConversation(shopRoom);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = useCallback(() => {
    // Refresh conversation when new message arrives
    loadConversation();
  }, []);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Đang tải cuộc trò chuyện...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-600 mb-4">Không tìm thấy cuộc trò chuyện</p>
        <Link href="/messages" className="text-blue-600 hover:text-blue-700">
          Quay lại Tin nhắn
        </Link>
      </div>
    );
  }

  const isShopRoom = conversation.room_name && conversation.room_name.includes('-shop');

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isShopRoom ? '🏪 Tin nhắn cửa hàng' : conversation.other_user.name}
            </h1>
            {isShopRoom && (
              <p className="text-sm text-gray-600 mt-1">{conversation.other_user.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          conversation={conversation}
          onNewMessage={handleNewMessage}
        />
      </div>
    </div>
  );
}
