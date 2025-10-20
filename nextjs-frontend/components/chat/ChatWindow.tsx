'use client';

import { useState, useEffect, useRef } from 'react';
import { chat, ChatMessage, Conversation } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime } from '@/lib/utils';
import VideoCallButton from './VideoCallButton';
import VideoChatModal from './VideoChatModal';
import IncomingCallNotification from './IncomingCallNotification';

interface ChatWindowProps {
  conversation: Conversation;
  onNewMessage?: () => void;
}

export default function ChatWindow({ conversation, onNewMessage }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomName, setRoomName] = useState<string>('');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCallVisible, setIncomingCallVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedRoomRef = useRef<string | null>(null);
  const { socket, isConnected, onIncomingCall, offIncomingCall } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  useEffect(() => {
    // Join the chat room when socket connects or room changes
    if (socket && conversation.room_name) {
      // Only join if we're not already in this room
      if (joinedRoomRef.current !== conversation.room_name) {
        console.log('Joining room:', conversation.room_name);
        socket.emit('chat:join-room', { roomName: conversation.room_name });
        setRoomName(conversation.room_name);
        joinedRoomRef.current = conversation.room_name;
      }
    }
  }, [socket, conversation.room_name]);

  // Separate effect to handle leaving room only when conversation ID changes
  useEffect(() => {
    return () => {
      // This cleanup only runs when conversation.id changes or component unmounts
      // Do NOT add socket to dependency array - that would cause cleanup on reconnection
      if (joinedRoomRef.current) {
        console.log('Leaving room:', joinedRoomRef.current);
        const currentSocket = socket;
        if (currentSocket) {
          currentSocket.emit('chat:leave-room', { roomName: joinedRoomRef.current });
        }
        joinedRoomRef.current = null;
      }
    };
  }, [conversation.id]);

  useEffect(() => {
    // Listen for new messages from Socket.IO
    const handleNewMessage = (message: any) => {
      // Convert conversation_id to number if it's a string
      const messageConversationId = typeof message.conversation_id === 'string'
        ? parseInt(message.conversation_id, 10)
        : message.conversation_id;

      if (messageConversationId === conversation.id) {
        // Determine if message is mine based on sender ID
        const senderId = message.sender_id || message.sender?.id;
        const isMine = senderId === user?.id;

        console.log(`💬 ChatWindow received message: sender_id=${senderId}, user_id=${user?.id}, is_mine=${isMine}`);

        // Create properly formatted message
        const formattedMessage: ChatMessage = {
          ...message,
          is_mine: isMine
        };

        setMessages((prev) => {
          // Check if message already exists to avoid duplicates
          const messageExists = prev.some(m => m.id === formattedMessage.id);
          if (messageExists) {
            console.log('⚠️ Message already exists, skipping duplicate:', formattedMessage.id);
            return prev;
          }
          console.log('➕ Adding new message:', formattedMessage.id);
          return [...prev, formattedMessage];
        });

        scrollToBottom();
        if (onNewMessage) {
          onNewMessage();
        }
      }
    };

    if (socket) {
      socket.on('new:message', handleNewMessage);
    }

    return () => {
      if (socket) {
        socket.off('new:message', handleNewMessage);
      }
    };
  }, [socket, conversation.id, onNewMessage, user]);

  // Listen for incoming video calls
  useEffect(() => {
    const handleIncomingCall = (data: any) => {
      console.log('Incoming call received:', data);
      setIncomingCallVisible(true);
    };

    onIncomingCall(handleIncomingCall);

    return () => {
      offIncomingCall(handleIncomingCall);
    };
  }, [onIncomingCall, offIncomingCall]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await chat.getMessages(conversation.id);
      setMessages(data.messages);
      setRoomName(data.room_name);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Format room names as "{host room} - {remote room}" and sort ascending
  const formatRoomName = (hostRoom?: string, remoteRoom?: string): string => {
    if (!hostRoom && !remoteRoom) return '';

    const rooms = [hostRoom || '', remoteRoom || ''].filter(Boolean);
    if (rooms.length === 0) return '';

    // Sort rooms in ascending order
    rooms.sort();

    return rooms.join(' - ');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      setSending(true);
      await chat.sendMessage(conversation.id, messageText);

      // Don't add message locally - let Socket.IO broadcast handle it
      // This prevents duplicate messages
      console.log('📤 Message sent, waiting for Socket.IO broadcast');

      // Note: The message will be added via the Socket.IO 'new:message' event
      // which ensures consistency across all clients

      if (onNewMessage) {
        onNewMessage();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleVideoCallClick = () => {
    setIsVideoModalOpen(true);
    setIsCallActive(true);
  };

  const handleVideoCallClose = () => {
    setIsVideoModalOpen(false);
    setIsCallActive(false);
  };

  const handleAcceptIncomingCall = () => {
    setIncomingCallVisible(false);
    setIsVideoModalOpen(true);
    setIsCallActive(true);
  };

  const handleRejectIncomingCall = () => {
    setIncomingCallVisible(false);
    // Optionally notify the caller that the call was rejected
    if (socket) {
      socket.emit('call:end', { to: 'all' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{conversation.other_user.name}</h2>
          <p className="text-sm text-gray-500">{conversation.other_user.email}</p>
          <p className="text-xs text-gray-400 mt-1">Room: {roomName || conversation.room_name}</p>
        </div>
        <VideoCallButton
          conversation={conversation}
          onVideoCallClick={handleVideoCallClick}
          isCallActive={isCallActive}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.is_mine
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {!message.is_mine && (
                  <p className="text-xs font-semibold mb-1 text-gray-600">
                    {message.sender.name}
                  </p>
                )}
                <p className="break-words">{message.message}</p>
                <div className="flex flex-col gap-1 mt-1">
                  {(message.host_room || message.remote_room) && (
                    <p
                      className={`text-xs ${
                        message.is_mine ? 'text-blue-200' : 'text-gray-400'
                      }`}
                    >
                      Room: {formatRoomName(message.host_room, message.remote_room)}
                    </p>
                  )}
                  <p
                    className={`text-xs ${
                      message.is_mine ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
        {isConnected && (
          <p className="text-xs text-green-600 mt-2">Connected</p>
        )}
        {!isConnected && (
          <p className="text-xs text-yellow-600 mt-2">Reconnecting...</p>
        )}
      </div>

      {/* Video Chat Modal */}
      <VideoChatModal
        isOpen={isVideoModalOpen}
        conversation={conversation}
        onClose={handleVideoCallClose}
      />

      {/* Incoming Call Notification */}
      <IncomingCallNotification
        conversation={conversation}
        isVisible={incomingCallVisible}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
      />
    </div>
  );
}
