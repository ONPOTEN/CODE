'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { chat, Conversation } from '@/lib/api';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { useSocket } from '@/contexts/SocketContext';
import { useSidebar } from '@/contexts/SidebarContext';
import Link from 'next/link';

export default function ConversationDetailPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conversationId = parseInt(params.conversationId as string, 10);
  const { onNewMessage, offNewMessage } = useSocket();
  const { isSidebarVisible, toggleSidebar } = useSidebar();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && conversationId) {
      loadConversations();
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

      // Update conversations list
      setConversations(prevConversations => {
        const messageConversationId = typeof message.conversation_id === 'string'
          ? parseInt(message.conversation_id, 10)
          : message.conversation_id;

        const conversationIndex = prevConversations.findIndex(c => c.id === messageConversationId);
        if (conversationIndex === -1) return prevConversations;

        const updatedConversations = [...prevConversations];
        const conversationToUpdate = { ...updatedConversations[conversationIndex] };

        conversationToUpdate.last_message = {
          message: message.message,
          created_at: message.created_at,
          is_mine: message.sender?.id === user?.id
        };

        updatedConversations.splice(conversationIndex, 1);
        updatedConversations.unshift(conversationToUpdate);

        return updatedConversations;
      });
    };

    onNewMessage(handleNewMessage);
    return () => {
      offNewMessage(handleNewMessage);
    };
  }, [onNewMessage, offNewMessage, user, conversationId, conversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chat.getConversations();

      // Find the conversation by ID
      const found = data.find(c => c.id === conversationId);

      // Handle shop room special case
      let shopRoom: Conversation | null = null;
      if (conversationId === -1) {
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

        shopRoom = {
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
      } else if (found) {
        setConversation(found);
      }

      // Set all conversations for the list (include shop room)
      const allConversations = shopRoom ? [shopRoom, ...data] : data;
      setConversations(allConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (selectedId: number) => {
    router.push(`/messages/${selectedId}`);
  };

  const handleNewMessageCallback = useCallback(() => {
    // Move current conversation to top
    setConversations(prevConversations => {
      const currentConv = prevConversations.find(c => c.id === conversationId);
      if (!currentConv) return prevConversations;

      const otherConversations = prevConversations.filter(c => c.id !== conversationId);
      return [currentConv, ...otherConversations];
    });
  }, [conversationId]);

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
    <div className={`flex flex-col h-screen bg-white transition-[margin-left] duration-300 ease-in-out ${isSidebarVisible ? 'lg:ml-sidebar' : ''}`}>
      {/* Header - Mobile only */}
      <div className="lg:hidden px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isShopRoom ? 'Tin nhắn cửa hàng' : conversation.other_user.name}
            </h1>
            {isShopRoom && (
              <p className="text-sm text-gray-600">{conversation.other_user.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Split view on desktop */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List - Left Panel (Desktop only) */}
        <div className="hidden lg:flex lg:flex-col lg:w-80 xl:w-96 border-r border-gray-200 bg-white">
          {/* List Header */}
          <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Tin nhắn</h2>
            {/* Toggle sidebar button - Desktop only */}
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
            >
              {isSidebarVisible ? (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Chat Window - Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow
            conversation={conversation}
            onNewMessage={handleNewMessageCallback}
          />
        </div>
      </div>
    </div>
  );
}
