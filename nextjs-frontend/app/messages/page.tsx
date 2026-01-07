'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { chat, Conversation } from '@/lib/api';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { useSocket } from '@/contexts/SocketContext';
import { useSidebar } from '@/contexts/SidebarContext';

export default function MessagesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onNewMessage, offNewMessage } = useSocket();
  const { isSidebarVisible, toggleSidebar } = useSidebar();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProcessedUrlParams, setHasProcessedUrlParams] = useState(false);

  // Check if URL has room or conversation params
  const roomParam = searchParams.get('room');
  const conversationParam = searchParams.get('conversation');
  const withParam = searchParams.get('with');
  const hasUrlParams = !!(roomParam || conversationParam || withParam);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated]);

  // Helper function to navigate to conversation (handles mobile redirect)
  const navigateToConversation = useCallback((conversationId: number) => {
    setSelectedConversationId(conversationId);
    // On mobile, redirect to the conversation detail page for better UX
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      if (isMobile) {
        router.push(`/messages/${conversationId}`);
      }
    }
  }, [router]);

  // Auto-select first conversation on desktop when loaded (only if no URL params)
  useEffect(() => {
    if (conversations.length > 0 && selectedConversationId === null && !hasUrlParams) {
      // Auto-select first conversation for desktop view (only when no URL params)
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId, hasUrlParams]);

  // Handle URL parameters (room, conversation, with) - runs after conversations load
  useEffect(() => {
    // Don't process if still loading or no conversations
    if (loading || conversations.length === 0) return;
    // Don't process again if already handled
    if (hasProcessedUrlParams) return;

    const processUrlParams = async () => {
      // Handle conversation ID parameter
      if (conversationParam) {
        const convId = parseInt(conversationParam, 10);
        if (!isNaN(convId)) {
          navigateToConversation(convId);
          setHasProcessedUrlParams(true);
          return;
        }
      }

      // Handle room parameter
      if (roomParam) {
        const conversation = conversations.find(c => c.room_name === roomParam);
        if (conversation) {
          navigateToConversation(conversation.id);
          setHasProcessedUrlParams(true);
          return;
        } else {
          // Room not found, try to create conversation from room name
          // Room name format: "userId1-userId2" e.g., "273-625"
          const roomParts = roomParam.split('-');
          if (roomParts.length === 2 && user?.id) {
            const otherUserId = roomParts.find(id => parseInt(id, 10) !== user.id);
            if (otherUserId) {
              try {
                const newConversation = await chat.getOrCreateConversation(parseInt(otherUserId, 10));
                if (newConversation) {
                  // Reload conversations and let the effect run again
                  await loadConversations();
                  // Mark as processed - the new conversation should be selected on next render
                }
              } catch (err) {
                console.error('Error creating conversation from room:', err);
              }
            }
          }
          setHasProcessedUrlParams(true);
          return;
        }
      }

      // Handle "with" parameter (create conversation with user)
      if (withParam && isAuthenticated) {
        try {
          const conversation = await chat.getOrCreateConversation(parseInt(withParam, 10));
          const existingConv = conversations.find(c => c.room_name === conversation.room_name);
          if (existingConv) {
            navigateToConversation(existingConv.id);
          } else {
            await loadConversations();
          }
        } catch (err) {
          console.error('Error creating conversation:', err);
        }
        setHasProcessedUrlParams(true);
        return;
      }
    };

    processUrlParams();
  }, [loading, conversations, conversationParam, roomParam, withParam, user, isAuthenticated, hasProcessedUrlParams, navigateToConversation]);

  // Listen for incoming messages and update conversation list
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      const messageConversationId = typeof message.conversation_id === 'string'
        ? parseInt(message.conversation_id, 10)
        : message.conversation_id;

      setConversations(prevConversations => {
        const conversationIndex = prevConversations.findIndex(c => c.id === messageConversationId);
        if (conversationIndex === -1) return prevConversations;

        const updatedConversations = [...prevConversations];
        const conversationToUpdate = { ...updatedConversations[conversationIndex] };

        const senderId = message.sender?.id;
        const isMine = senderId === user?.id;

        conversationToUpdate.last_message = {
          message: message.message,
          created_at: message.created_at,
          is_mine: isMine
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
  }, [onNewMessage, offNewMessage, user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chat.getConversations();

      // Fetch last message for shop room "656-shop1"
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
        console.warn('[MessagesPage] Failed to fetch shop messages:', error);
        lastMessage = undefined;
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

      const combined = [shopRoom, ...data];
      setConversations(combined);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: number) => {
    navigateToConversation(conversationId);
  };

  const handleNewMessageCallback = useCallback(() => {
    if (selectedConversationId === null) return;

    setConversations(prevConversations => {
      const selectedConv = prevConversations.find(c => c.id === selectedConversationId);
      if (!selectedConv) return prevConversations;

      const otherConversations = prevConversations.filter(c => c.id !== selectedConversationId);
      return [selectedConv, ...otherConversations];
    });
  }, [selectedConversationId]);

  if (!isAuthenticated) {
    return null;
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className={`flex flex-col h-screen bg-white transition-[margin-left] duration-300 ease-in-out ${isSidebarVisible ? 'lg:ml-sidebar' : ''}`}>
      {/* Main Content - Split view on desktop */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List - Left Panel */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col border-r border-gray-200 bg-white">
          {/* List Header */}
          <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Tin nhắn</h2>
            {/* Toggle sidebar button - Desktop only */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
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
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Chat Window - Right Panel (Desktop only) */}
        <div className="hidden lg:flex lg:flex-1 flex-col overflow-hidden">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              onNewMessage={handleNewMessageCallback}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">Chọn một cuộc trò chuyện</p>
                <p className="text-sm mt-1">Chọn từ danh sách bên trái để bắt đầu nhắn tin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
