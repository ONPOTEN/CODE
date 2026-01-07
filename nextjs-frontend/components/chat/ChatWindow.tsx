'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { chat, ChatMessage, Conversation } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime } from '@/lib/utils';
import { uploadFileViaProxy } from '@/lib/s3-upload';
import VideoCallButton from './VideoCallButton';
import VideoChatModal from './VideoChatModal';
import IncomingCallNotification from './IncomingCallNotification';
import { GroupInvitationMessage } from '@/components/GroupInvitationMessage';

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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedRoomRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Image attachment handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        newFiles.push(file);
        newPreviewUrls.push(URL.createObjectURL(file));
      }
    });

    setSelectedImages((prev) => [...prev, ...newFiles]);
    setImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      try {
        setUploadProgress(((i + 0.5) / selectedImages.length) * 100);

        const fileUrl = await uploadFileViaProxy(file, (progress) => {
          const overallProgress = ((i + progress / 100) / selectedImages.length) * 100;
          setUploadProgress(overallProgress);
        });

        uploadedUrls.push(fileUrl);
        setUploadProgress(((i + 1) / selectedImages.length) * 100);
      } catch (error) {
        console.error(`Failed to upload image ${file.name}:`, error);
        throw error;
      }
    }

    return uploadedUrls;
  };

  const handleSendWithImages = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!newMessage.trim() && selectedImages.length === 0) || sending || isUploading) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      setSending(true);

      let imageUrls: string[] = [];

      // Upload images first if any
      if (selectedImages.length > 0) {
        setIsUploading(true);
        try {
          imageUrls = await uploadImages();
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }

      // Build message content with image URLs
      let finalMessage = messageText;
      if (imageUrls.length > 0) {
        const imageMarkup = imageUrls.map((url) => `[IMAGE]${url}[/IMAGE]`).join('\n');
        finalMessage = messageText ? `${messageText}\n${imageMarkup}` : imageMarkup;
      }

      if (!finalMessage) return;

      // Detect shop message room
      const effectiveRoomName = conversation.room_name || roomName;
      const isShopMessageRoom = effectiveRoomName && effectiveRoomName.includes('-shop');

      if (isShopMessageRoom && user) {
        const room = effectiveRoomName!;
        const match = room.match(/^(\d+)-shop(\d+)$/);
        const customerId = match ? parseInt(match[1], 10) : 0;
        const shopIdNum = match ? parseInt(match[2], 10) : 0;

        const response = await chat.sendShopMessage(
          shopIdNum,
          customerId,
          user.id,
          finalMessage,
          conversation.shop_owner_id
        );

        if (socket && isConnected) {
          socket.emit('shop:chat:message', {
            shopId: shopIdNum,
            shopName: '',
            shopOwnerId: conversation.shop_owner_id,
            senderId: user.id,
            senderName: user?.display_name || user?.username || 'User',
            message: finalMessage,
            roomName: room,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (conversation.id) {
        await chat.sendMessage(conversation.id, finalMessage);
      }

      // Clear selected images after sending
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedImages([]);
      setImagePreviewUrls([]);

      if (onNewMessage) {
        onNewMessage();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Helper function to check if message contains images
  const isImageMessage = (message: string): boolean => {
    return message.includes('[IMAGE]') && message.includes('[/IMAGE]');
  };

  // Helper function to parse message and extract images
  const parseMessageContent = (message: string): { text: string; images: string[] } => {
    const images: string[] = [];
    const imageRegex = /\[IMAGE\](.*?)\[\/IMAGE\]/g;
    let match;

    while ((match = imageRegex.exec(message)) !== null) {
      images.push(match[1]);
    }

    const text = message.replace(imageRegex, '').trim();

    return { text, images };
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
        <div className="text-gray-600">Đang tải tin nhắn...</div>
      </div>
    );
  }

  // Check if this is a shop message room
  const isShopRoom = conversation.room_name && conversation.room_name.includes('-shop');

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {isShopRoom ? (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">
              🏪
            </div>
          ) : conversation.other_user.avatar ? (
            <Image
              src={conversation.other_user.avatar}
              alt={conversation.other_user.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold flex-shrink-0">
              {conversation.other_user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg text-gray-900 truncate">
              {isShopRoom ? 'Tin nhắn cửa hàng' : conversation.other_user.name}
            </h2>
            {isShopRoom ? (
              <p className="text-sm text-gray-500 truncate">{conversation.other_user.name}</p>
            ) : (
              <p className="text-sm text-gray-500 truncate">{conversation.other_user.email}</p>
            )}
          </div>
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
            Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
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
                {message.message.includes('[INVITATION]') ? (
                  <GroupInvitationMessage
                    messageContent={message.message}
                    userId={user?.id}
                    onActionComplete={() => {
                      console.log('Invitation action completed');
                    }}
                  />
                ) : isImageMessage(message.message) ? (
                  (() => {
                    const { text, images } = parseMessageContent(message.message);
                    return (
                      <>
                        {text && <p className="break-words mb-2">{text}</p>}
                        <div className="space-y-2">
                          {images.map((imageUrl, idx) => (
                            <a
                              key={idx}
                              href={imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={imageUrl}
                                alt={`Hình ảnh ${idx + 1}`}
                                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxHeight: '300px', objectFit: 'contain' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <p className="break-words">{message.message}</p>
                )}
                <div className="flex flex-col gap-1 mt-1">
                  {(message.host_room || message.remote_room) && (
                    <p
                      className={`text-xs ${
                        message.is_mine ? 'text-blue-200' : 'text-gray-600'
                      }`}
                    >
                      Phòng: {formatRoomName(message.host_room, message.remote_room)}
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
        {/* Image Preview */}
        {imagePreviewUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-white rounded-lg border border-gray-200">
            {imagePreviewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => removeSelectedImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Đang tải ảnh lên... {Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSendWithImages} className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Image attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || isUploading}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Đính kèm hình ảnh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending || isUploading}
          />
          <button
            type="submit"
            disabled={sending || isUploading || (!newMessage.trim() && selectedImages.length === 0)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {sending || isUploading ? 'Đang gửi...' : 'Gửi'}
          </button>
        </form>
        {isConnected && (
          <p className="text-xs text-green-600 mt-2">Đã kết nối</p>
        )}
        {!isConnected && (
          <p className="text-xs text-yellow-600 mt-2">Đang kết nối lại...</p>
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
