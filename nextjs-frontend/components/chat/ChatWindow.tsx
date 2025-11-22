'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
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
  }, [conversation.id, roomName]);

  useEffect(() => {
    // Join the chat room when socket connects or room changes
    if (socket && conversation.room_name) {
      // Only join if we're not already in this room
      if (joinedRoomRef.current !== conversation.room_name) {
        // Detect if this is a shop message room (format: {customerId}-shop{shopId})
        const isShopMessageRoom = conversation.room_name.includes('-shop');

        if (isShopMessageRoom) {
          // Join shop message room
          console.log('[ChatWindow] 🏪 Joining shop message room:', conversation.room_name);
          const match = conversation.room_name.match(/^(\d+)-shop(\d+)$/);
          if (match) {
            const customerId = parseInt(match[1], 10);
            const shopId = parseInt(match[2], 10);
            socket.emit('join:shop:chat', {
              userId: user?.id,
              shopId: shopId,
              shopOwnerId: conversation.shop_owner_id,
              roomName: conversation.room_name,
              userName: user?.display_name || user?.username || 'User',
            });
            console.log('[ChatWindow] ✅ Emitted join:shop:chat for room:', conversation.room_name);
          }
        } else {
          // Join regular chat room
          console.log('[ChatWindow] 👤 Joining regular chat room:', conversation.room_name);
          socket.emit('chat:join-room', { roomName: conversation.room_name });
          console.log('[ChatWindow] ✅ Emitted chat:join-room for room:', conversation.room_name);
        }

        setRoomName(conversation.room_name);
        joinedRoomRef.current = conversation.room_name;
      }
    }
  }, [socket, conversation.room_name, conversation.shop_owner_id, user]);

  // Handle shop message room joining via URL params (with={customerId}&shopId={shopId})
  useEffect(() => {
    const withUserId = searchParams.get('with');
    const shopId = searchParams.get('shopId');

    if (withUserId && shopId && socket && user) {
      const customerId = parseInt(withUserId, 10);
      const shopIdNum = parseInt(shopId, 10);
      const shopMessageRoomName = `${customerId}-shop${shopIdNum}`;

      console.log('[ChatWindow] Detected shop message reply - with:', withUserId, 'shopId:', shopId);
      console.log('[ChatWindow] Joining shop message room:', shopMessageRoomName);

      // Only join if we're not already in this room
      if (joinedRoomRef.current !== shopMessageRoomName) {
        // Use join:shop:chat for shop message rooms (not join:chat:room)
        socket.emit('join:shop:chat', {
          userId: user.id,
          shopId: shopIdNum,
          shopOwnerId: user.id, // Current user is the shop owner in this context
          roomName: shopMessageRoomName,
          userName: user?.display_name || user?.username || 'User',
        });

        console.log('[ChatWindow] ✅ Emitted join:shop:chat for shop message room:', shopMessageRoomName);
        setRoomName(shopMessageRoomName);
        joinedRoomRef.current = shopMessageRoomName;
      }
    }
  }, [searchParams, socket, user]);

  // Separate effect to handle leaving room only when conversation ID changes
  useEffect(() => {
    return () => {
      // This cleanup only runs when conversation.id changes or component unmounts
      // Do NOT add socket to dependency array - that would cause cleanup on reconnection
      if (joinedRoomRef.current) {
        console.log('[ChatWindow] Leaving room:', joinedRoomRef.current);
        const currentSocket = socket;
        if (currentSocket) {
          // Detect if this is a shop message room
          const isShopMessageRoom = joinedRoomRef.current.includes('-shop');

          if (isShopMessageRoom) {
            // Leave shop message room
            const match = joinedRoomRef.current.match(/^(\d+)-shop(\d+)$/);
            if (match) {
              const customerId = parseInt(match[1], 10);
              const shopId = parseInt(match[2], 10);
              currentSocket.emit('leave:shop:chat', {
                userId: user?.id,
                shopId: shopId,
                roomName: joinedRoomRef.current,
              });
              console.log('[ChatWindow] ✅ Emitted leave:shop:chat for room:', joinedRoomRef.current);
            }
          } else {
            // Leave regular chat room
            currentSocket.emit('chat:leave-room', { roomName: joinedRoomRef.current });
            console.log('[ChatWindow] ✅ Emitted chat:leave-room for room:', joinedRoomRef.current);
          }
        }
        joinedRoomRef.current = null;
      }
    };
  }, [conversation.id, user?.id, socket]);

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

    // Listen for shop chat messages (for shop message rooms like 656-shop1)
    const handleShopChatMessage = (data: any) => {
      console.log('[ChatWindow] Received shop:chat:message event:', {
        shopId: data.shopId,
        senderId: data.senderId,
        senderName: data.senderName,
        message: data.message?.substring(0, 50),
        roomName: data.roomName
      });

      // Check if this message is for our current room
      if (data.roomName === conversation.room_name) {
        const isMine = data.senderId === user?.id;

        console.log(`💬 ChatWindow shop message - senderId=${data.senderId}, userId=${user?.id}, isMine=${isMine}`);

        // Format shop message to match ChatMessage interface
        const formattedMessage: ChatMessage = {
          id: Math.floor(new Date(data.timestamp).getTime() / 1000) + data.senderId, // Create unique numeric ID from timestamp and sender
          sender: {
            id: data.senderId,
            name: data.senderName,
          },
          message: data.message,
          is_mine: isMine,
          is_read: false,
          created_at: data.timestamp,
          conversation_id: conversation.id,
          shop_id: data.shopId // Include shop info
        };

        setMessages((prev) => {
          // Check if message already exists to avoid duplicates
          const messageExists = prev.some(m => m.id === formattedMessage.id);
          if (messageExists) {
            console.log('⚠️ Shop message already exists, skipping duplicate:', formattedMessage.id);
            return prev;
          }
          console.log('➕ Adding new shop message:', formattedMessage.id);
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
      socket.on('shop:chat:message', handleShopChatMessage);
    }

    return () => {
      if (socket) {
        socket.off('new:message', handleNewMessage);
        socket.off('shop:chat:message', handleShopChatMessage);
      }
    };
  }, [socket, conversation.id, conversation.room_name, onNewMessage, user]);

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

      // Detect shop message room by room_name format: "{customerId}-shop{shopId}"
      // Check both conversation.room_name and locally set roomName (for URL param cases)
      const effectiveRoomName = conversation.room_name || roomName;
      const isShopMessageRoom = effectiveRoomName && effectiveRoomName.includes('-shop');

      console.log('[ChatWindow] loadMessages - effectiveRoomName:', effectiveRoomName, 'isShopMessageRoom:', isShopMessageRoom);

      if (isShopMessageRoom) {
        // This is a shop message room - load shop messages from database
        const room = effectiveRoomName!;

        console.log('[ChatWindow] Loading shop messages for room:', room);

        try {
          // Fetch historical messages from API using room name
          console.log('[ChatWindow] About to fetch messages from API for room:', room);
          const data = await chat.getShopMessagesByRoomName(room);

          console.log('[ChatWindow] ✅ API returned room data:', {
            roomName: data.room_name,
            messageCount: data.messages.length,
          });

          // Format messages with is_mine flag based on sender vs current user
          const formattedMessages = data.messages.map((msg) => ({
            ...msg,
            is_mine: msg.sender?.id === user?.id,
          }));

          console.log('[ChatWindow] ✅ Formatted messages for display:', {
            count: formattedMessages.length,
            currentUserId: user?.id,
          });

          setMessages(formattedMessages);
          setRoomName(data.room_name);
        } catch (error) {
          console.warn('[ChatWindow] Failed to load shop messages from API:', error);
          // If API call fails, show empty array - new messages will come via Socket.IO
          console.log('[ChatWindow] Continuing without historical messages');
          setMessages([]);
          setRoomName(room);
        }
      } else if (conversation.id) {
        // Regular conversation - load from API
        console.log('[ChatWindow] Loading regular conversation, ID:', conversation.id, 'Room name:', conversation.room_name);

        const data = await chat.getMessages(conversation.id);
        setMessages(data.messages);
        setRoomName(data.room_name);
        console.log('[ChatWindow] ✅ Loaded regular conversation messages:', {
          id: conversation.id,
          messageCount: data.messages.length,
          roomName: data.room_name,
        });
      } else {
        console.log('[ChatWindow] No room or conversation to load messages for');
      }

      scrollToBottom();
    } catch (error) {
      console.error('[ChatWindow] Failed to load messages:', error);
      setMessages([]);
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

      // Detect shop message room by room_name format: "{customerId}-shop{shopId}"
      // Check both conversation.room_name and locally set roomName (for URL param cases)
      const effectiveRoomName = conversation.room_name || roomName;
      const isShopMessageRoom = effectiveRoomName && effectiveRoomName.includes('-shop');

      if (isShopMessageRoom && user) {
        // This is a shop message reply - send via API
        const room = effectiveRoomName!;

        // Extract customer ID and shop ID from room name: "656-shop1" → customerId=656, shopId=1
        const match = room.match(/^(\d+)-shop(\d+)$/);
        const customerId = match ? parseInt(match[1], 10) : 0;
        const shopIdNum = match ? parseInt(match[2], 10) : 0;

        console.log('[ChatWindow] Sending shop message via API');
        console.log('[ChatWindow] Extracted IDs from room name:', { roomName: room, customerId, shopId: shopIdNum });
        console.log('[ChatWindow] Message content:', messageText);

        // Send shop message via API
        try {
          console.log('[ChatWindow] Shop message room data:', {
            shop_owner_id: conversation.shop_owner_id,
            has_shop_owner_id: !!conversation.shop_owner_id,
          });
          const response = await chat.sendShopMessage(
            shopIdNum,
            customerId,
            user.id,
            messageText,
            conversation.shop_owner_id // Pass shop owner ID from conversation
          );
          console.log('[ChatWindow] ✅ Shop message sent successfully via API:', {
            shopId: shopIdNum,
            customerId: customerId,
            senderId: user.id,
            shopOwnerId: conversation.shop_owner_id,
            messageId: response.id,
            message: response.message.substring(0, 50)
          });

          // After successful API save, emit to Socket.IO for real-time delivery
          if (socket && isConnected) {
            console.log('[ChatWindow] 📡 Emitting shop message to Socket.IO for real-time broadcast');
            socket.emit('shop:chat:message', {
              shopId: shopIdNum,
              shopName: '', // Shop name not available in conversation, can be fetched from API if needed
              shopOwnerId: conversation.shop_owner_id,
              senderId: user.id,
              senderName: user?.display_name || user?.username || 'User',
              message: messageText,
              roomName: room,
              timestamp: new Date().toISOString()
            });
            console.log('[ChatWindow] ✅ Shop message emitted to Socket.IO');
          } else {
            console.warn('[ChatWindow] ⚠️ Socket not connected, message will not be broadcast in real-time');
          }
        } catch (error) {
          console.error('[ChatWindow] Failed to send shop message:', error);
          throw error;
        }
      } else if (conversation.id) {
        // Regular chat message
        await chat.sendMessage(conversation.id, messageText);
        console.log('📤 Message sent, waiting for Socket.IO broadcast');
      } else {
        console.warn('[ChatWindow] No room or conversation to send message to');
      }

      // Note: The message will be added via the Socket.IO 'new:message' or 'shop:message' event
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
      <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{conversation.other_user.name}</h2>
          <p className="text-sm text-gray-500">{conversation.other_user.email}</p>
          <p className="text-xs text-gray-600 mt-1">Room: {roomName || conversation.room_name}</p>
        </div>
        <VideoCallButton
          conversation={conversation}
          onVideoCallClick={handleVideoCallClick}
          isCallActive={isCallActive}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
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
                    ? 'bg-blue-600 text-gray-900'
                    : 'bg-gray-50 text-gray-900 border border-gray-300'
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
                        message.is_mine ? 'text-blue-200' : 'text-gray-600'
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
      <div className="p-4 border-t border-gray-300 bg-gray-50">
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
            className="px-6 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
