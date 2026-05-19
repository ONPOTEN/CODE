'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const messageCallbackRef = useRef<((message: any) => void) | null>(null);

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
    // Create stable callback using ref
    messageCallbackRef.current = (message: any) => {
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

    // Register the listener
    if (messageCallbackRef.current) {
      onNewMessage(messageCallbackRef.current);
    }

    // Cleanup: remove the specific listener
    return () => {
      if (messageCallbackRef.current) {
        offNewMessage(messageCallbackRef.current);
        messageCallbackRef.current = null;
      }
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

  const handleNewMessageCallback = useCallback((message?: any) => {
    // Move current conversation to top and update last_message
    setConversations(prevConversations => {
      const conversationIndex = prevConversations.findIndex(c => c.id === conversationId);
      if (conversationIndex === -1) return prevConversations;

      const updatedConversations = [...prevConversations];
      const conversationToUpdate = { ...updatedConversations[conversationIndex] };

      // Update last_message if message data is provided
      if (message && message.message) {
        conversationToUpdate.last_message = {
          message: message.message,
          created_at: message.created_at || new Date().toISOString(),
          is_mine: message.is_mine ?? message.sender?.id === user?.id
        };
      }

      // Move to top
      updatedConversations.splice(conversationIndex, 1);
      updatedConversations.unshift(conversationToUpdate);

      return updatedConversations;
    });
  }, [conversationId, user]);

  if (isLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-16 h-16 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-3xl mb-4 animate-bounce grayscale opacity-50">💬</div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải cuộc trò chuyện...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] p-8 text-center">
        <div className="w-20 h-20 rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center text-4xl mb-6 grayscale opacity-40">🚫</div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Không tìm thấy cuộc trò chuyện</h3>
        <Link href="/messages" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition-all active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          Quay lại Tin nhắn
        </Link>
      </div>
    );
  }

  const isShopRoom = conversation.room_name && conversation.room_name.includes('-shop');

  return (
    <div className={`flex flex-col h-screen bg-[#F8FAFC] transition-[margin-left] duration-300 ease-in-out ${isSidebarVisible ? 'lg:ml-sidebar' : ''}`}>
      {/* Header - Mobile only */}
      <div className="lg:hidden px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/messages" className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-slate-800 tracking-tight leading-tight truncate">
              {isShopRoom ? 'Tin nhắn cửa hàng' : conversation.other_user.name}
            </h1>
            <div className="flex items-center gap-1.5 opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] font-black uppercase tracking-widest truncate">
                {isShopRoom ? conversation.other_user.name : 'Đang hoạt động'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Split view on desktop */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Conversation List - Left Panel (Desktop only) */}
        <div className="hidden lg:flex lg:flex-col lg:w-80 xl:w-[400px] border-r border-slate-100 bg-white shadow-xl shadow-slate-200/50 relative z-30">
          {/* List Header */}
          <div className="px-6 py-6 flex items-center justify-between border-b border-slate-50">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inbox</h2>
            {/* Toggle sidebar button - Desktop only */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300"
              aria-label={isSidebarVisible ? "Ẩn thanh bên" : "Hiện thanh bên"}
            >
              {isSidebarVisible ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ConversationList
              conversations={conversations}
              selectedConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Chat Window - Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 min-h-0">
          <ChatWindow
            conversation={conversation}
            onNewMessage={handleNewMessageCallback}
          />
        </div>
      </div>
    </div>
  );
}
