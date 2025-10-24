'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { chat, Conversation } from '@/lib/api';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { useSocket } from '@/contexts/SocketContext';

export default function MessagesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onNewMessage, offNewMessage } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // Check for conversation ID in URL params
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversationId(parseInt(conversationId, 10));
    }
  }, [searchParams]);

  // Listen for incoming messages and update conversation list
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      console.log('📨 MessagesPage received new:message event:', message);
      console.log('📨 Message details:', {
        id: message.id,
        conversation_id: message.conversation_id,
        message: message.message,
        sender_id: message.sender_id || message.sender?.id,
        current_user_id: user?.id,
        is_mine: message.is_mine,
        created_at: message.created_at
      });

      // Update conversations list with latest message
      setConversations(prevConversations => {
        console.log('📊 Current conversations:', prevConversations.map(c => ({ id: c.id, name: c.other_user.name })));
        console.log('📍 Looking for conversation_id:', message.conversation_id, 'Type:', typeof message.conversation_id);

        // Convert conversation_id to number if it's a string
        const messageConversationId = typeof message.conversation_id === 'string'
          ? parseInt(message.conversation_id, 10)
          : message.conversation_id;

        // Find if conversation exists
        const conversationIndex = prevConversations.findIndex(c => c.id === messageConversationId);
        console.log('✅ Conversation found at index:', conversationIndex);

        if (conversationIndex === -1) {
          console.log('❌ Conversation not found in list');
          return prevConversations;
        }

        // Create updated conversations array
        const updatedConversations = [...prevConversations];
        const conversationToUpdate = { ...updatedConversations[conversationIndex] };

        // Determine if message is mine based on sender ID
        const senderId = message.sender_id || message.sender?.id;
        const isMine = senderId === user?.id;

        console.log(`🔍 Determining is_mine: sender_id=${senderId}, user_id=${user?.id}, is_mine=${isMine}`);

        // Update the last_message
        conversationToUpdate.last_message = {
          message: message.message,
          created_at: message.created_at,
          is_mine: isMine
        };

        console.log('🔄 Updated conversation:', conversationToUpdate);

        // Remove from current position and add to front
        updatedConversations.splice(conversationIndex, 1);
        updatedConversations.unshift(conversationToUpdate);

        console.log('⬆️ Moved conversation to top');
        console.log('📝 New order:', updatedConversations.map(c => c.other_user.name));

        return updatedConversations;
      });
    };

    console.log('🎧 Attaching socket listener for new:message in MessagesPage');
    console.log('👤 Current user:', user);
    onNewMessage(handleNewMessage);

    return () => {
      console.log('🔌 Removing socket listener for new:message in MessagesPage');
      offNewMessage(handleNewMessage);
    };
  }, [onNewMessage, offNewMessage, user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chat.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);
  };

  const handleNewMessage = useCallback(() => {
    // Update the selected conversation locally to show it at the top with latest message
    // This avoids fetching fresh data which would cause ChatWindow to re-mount
    if (selectedConversationId === null) return;

    console.log('handleNewMessage called for conversation:', selectedConversationId);

    setConversations(prevConversations => {
      const selectedConv = prevConversations.find(c => c.id === selectedConversationId);
      if (!selectedConv) {
        console.log('Selected conversation not found');
        return prevConversations;
      }

      console.log('Moving conversation to top:', selectedConversationId);
      // Move selected conversation to the top
      const otherConversations = prevConversations.filter(c => c.id !== selectedConversationId);
      return [selectedConv, ...otherConversations];
    });
  }, [selectedConversationId]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
            />
          </div>

          {/* Chat Window */}
          <div className="w-2/3 flex flex-col">
            {selectedConversation ? (
              <ChatWindow
                conversation={selectedConversation}
                onNewMessage={handleNewMessage}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
