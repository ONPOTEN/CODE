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
import ChatBubble from './ChatBubble';
import MessageReplyPreview from './MessageReplyPreview';
import PinnedMessagesBar from './PinnedMessagesBar';

// Helper function to get the display name for a user
function getDisplayName(otherUser: Conversation['other_user'] | undefined, fallback = 'Người dùng'): string {
  if (!otherUser?.name) {
    return `${fallback} ${otherUser?.id || '?'}`;
  }
  return otherUser.name;
}

// Helper function to get the initials for a user
function getInitials(name: string): string {
  if (!name || name.trim() === '') return '?';
  return name.trim().charAt(0).toUpperCase();
}

// Helper component for avatar with fallback
function UserAvatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imageError, setImageError] = useState(false);

  const pixelSize = size === 40 ? 'w-10 h-10' : 'w-12 h-12';
  const textSize = size === 40 ? 'text-base' : 'text-lg';

  // If no avatar URL or image failed to load, show initials
  if (!avatarUrl || imageError) {
    return (
      <div className={`${pixelSize} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ${textSize} font-semibold text-white shadow-sm flex-shrink-0`}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <Image
      src={avatarUrl}
      alt={name}
      width={size}
      height={size}
      className={`${pixelSize} rounded-full object-cover shadow-sm flex-shrink-0`}
      onError={() => setImageError(true)}
      unoptimized={
        avatarUrl.startsWith('http://') ||
        !avatarUrl.includes('.centimet2.com')
      }
    />
  );
}

interface ChatWindowProps {
  conversation: Conversation;
  onNewMessage?: (message?: ChatMessage) => void;
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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedRoomRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newMessageCallbackRef = useRef<((message: any) => void) | null>(null);
  const shopMessageCallbackRef = useRef<((message: any) => void) | null>(null);
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
    // Listen for new messages from Socket.IO - store callback in ref
    newMessageCallbackRef.current = (message: any) => {
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
          is_mine: isMine,
          is_pinned: !!message.is_pinned
        };

        setMessages((prev) => {
          // Check if message already exists to avoid duplicates
          // For own messages, also check by content since temp ID differs from server ID
          const messageExists = prev.some(m => {
            if (m.id === formattedMessage.id) return true;
            // If it's my own message with same content and recent timestamp, it's a duplicate
            if (isMine && m.message === formattedMessage.message && m.is_mine) {
              const timeDiff = Math.abs(
                new Date(m.created_at).getTime() - new Date(formattedMessage.created_at).getTime()
              );
              // If within 5 seconds, consider it a duplicate (our sent message)
              if (timeDiff < 5000) return true;
            }
            return false;
          });
          if (messageExists) {
            console.log('⚠️ Message already exists, skipping duplicate:', formattedMessage.id);
            return prev;
          }
          console.log('➕ Adding new message:', formattedMessage.id);
          return [...prev, formattedMessage];
        });

        scrollToBottom();
        if (onNewMessage) {
          onNewMessage(formattedMessage);
        }
      }
    };

    // Listen for shop chat messages (for shop message rooms like 656-shop1) - store callback in ref
    shopMessageCallbackRef.current = (data: any) => {
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
          shop_id: data.shopId, // Include shop info
          is_pinned: !!data.is_pinned,
          reply_to: data.replyTo ? {
            id: data.replyTo.id,
            message: data.replyTo.message,
            sender_name: data.replyTo.sender_name || data.replyTo.sender?.display_name || data.replyTo.sender?.name || 'User'
          } : undefined
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
          onNewMessage(formattedMessage);
        }
      }
    };

    // Register the listeners
    if (socket) {
      if (newMessageCallbackRef.current) {
        socket.on('new:message', newMessageCallbackRef.current);
      }
      if (shopMessageCallbackRef.current) {
        socket.on('shop:chat:message', shopMessageCallbackRef.current);
      }
      
      socket.on('chat:typing', ({ userId, isTyping }: { userId: number; isTyping: boolean }) => {
        if (userId !== user?.id) {
          setIsOtherTyping(isTyping);
        }
      });

      socket.on('chat:message:deleted', ({ messageId }: { messageId: number }) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      });

      socket.on('chat:pin', ({ messageId }: { messageId: number }) => {
        setMessages((prev) => prev.map((m) => 
          m.id === messageId ? { ...m, is_pinned: !m.is_pinned } : m
        ));
      });

      socket.on('chat:reaction', ({ messageId, emoji, userId }: { messageId: number, emoji: string, userId: number }) => {
        if (userId === user?.id) return; // Ignore own reaction as it's handled optimistically
        
        setMessages((prev) => prev.map((m) => {
          if (m.id === messageId) {
            const hasEmoji = m.reactions?.includes(emoji);
            return {
              ...m,
              reactions: hasEmoji ? m.reactions : [...(m.reactions || []), emoji],
              reactions_count: (m.reactions_count || 0) + 1 // Incremental update
            };
          }
          return m;
        }));
      });
    }

    // Cleanup: remove the specific listeners
    return () => {
      if (socket) {
        if (newMessageCallbackRef.current) {
          socket.off('new:message', newMessageCallbackRef.current);
        }
        if (shopMessageCallbackRef.current) {
          socket.off('shop:chat:message', shopMessageCallbackRef.current);
        }
        socket.off('chat:typing');
        socket.off('chat:message:deleted');
        socket.off('chat:pin');
      socket.off('chat:reaction');
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

  useEffect(() => {
    if (messages.length > 0 && conversation.id) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage.is_mine && !lastMessage.is_read) {
        chat.markAsRead(conversation.id).catch(console.error);
      }
    }
  }, [messages.length, conversation.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const scrollToMessage = (messageId: number) => {
    const element = document.getElementById(`message-bubble-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a flash effect to the bubble
      element.classList.add('ring-2', 'ring-[#0068FF]', 'ring-offset-2', 'rounded-2xl', 'transition-all', 'duration-500');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-[#0068FF]', 'ring-offset-2');
      }, 2000);
    }
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

      const effectiveRoomName = conversation.room_name || roomName;
      const isShopMessageRoom = effectiveRoomName && effectiveRoomName.includes('-shop');

      if (isShopMessageRoom && user) {
        const room = effectiveRoomName!;
        const match = room.match(/^(\d+)-shop(\d+)$/);
        const customerId = match ? parseInt(match[1], 10) : 0;
        const shopIdNum = match ? parseInt(match[2], 10) : 0;

        try {
          const response = await chat.sendShopMessage(
            shopIdNum,
            customerId,
            user.id,
            messageText,
            conversation.shop_owner_id
          );

          if (socket && isConnected) {
            socket.emit('shop:chat:message', {
              shopId: shopIdNum,
              shopName: '',
              shopOwnerId: conversation.shop_owner_id,
              senderId: user.id,
              senderName: user?.display_name || user?.username || 'User',
              message: messageText,
              roomName: room,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('[ChatWindow] Failed to send shop message:', error);
          throw error;
        }
      } else if (conversation.id) {
        await chat.sendMessage(conversation.id, messageText, replyingTo?.id);
        console.log('📤 Message sent, waiting for Socket.IO broadcast');
      }

      const tempMessage: ChatMessage = {
        id: Date.now(),
        message: messageText,
        created_at: new Date().toISOString(),
        is_mine: true,
        is_read: false,
        conversation_id: conversation.id,
        sender: {
          id: user?.id || 0,
          name: user?.display_name || user?.username || 'Bạn',
        },
        reply_to: replyingTo ? {
          id: replyingTo.id,
          message: replyingTo.message,
          sender_name: replyingTo.sender?.name || 'User'
        } : undefined
      };

      setMessages(prev => [...prev, tempMessage]);
      setReplyingTo(null);
      scrollToBottom();

      if (onNewMessage) {
        onNewMessage(tempMessage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageText);
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
        // Regular chat message
        await chat.sendMessage(conversation.id, finalMessage, replyingTo?.id);
      }

      // Clear selected images after sending
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedImages([]);
      setImagePreviewUrls([]);

      // Create temporary message for immediate display
      const tempMessage: ChatMessage = {
        id: Date.now(), // Temporary ID, will be replaced by server response
        message: finalMessage,
        created_at: new Date().toISOString(),
        is_mine: true,
        is_read: false,
        conversation_id: conversation.id,
        sender: {
          id: user?.id || 0,
          name: user?.display_name || user?.username || 'Bạn',
        },
        reply_to: replyingTo ? {
          id: replyingTo.id,
          message: replyingTo.message,
          sender_name: replyingTo.sender?.name || 'User'
        } : undefined
      };

      // Add message to chat window immediately for better UX
      setMessages(prev => [...prev, tempMessage]);
      setReplyingTo(null);
      scrollToBottom();

      // Update conversation list preview
      if (onNewMessage) {
        onNewMessage(tempMessage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (socket && isConnected) {
      socket.emit('chat:typing', {
        to: conversation.room_name,
        userId: user?.id,
        isTyping: true
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('chat:typing', {
          to: conversation.room_name,
          userId: user?.id,
          isTyping: false
        });
      }, 3000);
    }
  };

  const handleReact = async (messageId: number, emoji: string) => {
    try {
      const isShopRoom = (conversation.room_name && conversation.room_name.includes('-shop')) || conversation.id === -1;
      
      // Update local state optimistically
      let isRemoving = false;
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          isRemoving = m.my_reaction === emoji;
          const newCount = isRemoving ? Math.max(0, (m.reactions_count || 0) - 1) : (m.reactions_count || 0) + 1;
          return {
            ...m,
            my_reaction: isRemoving ? undefined : emoji,
            reactions_count: newCount,
            reactions: isRemoving ? m.reactions?.filter(e => e !== emoji) : [...new Set([...(m.reactions || []), emoji])]
          };
        }
        return m;
      }));

      // API persistence
      if (isShopRoom) {
        let shopId = messages.find(m => m.id === messageId)?.shop_id;
        if (!shopId && conversation.room_name) {
          const match = conversation.room_name.match(/-shop(\d+)$/);
          if (match) shopId = parseInt(match[1], 10);
        }
        if (shopId) {
          await chat.toggleShopReaction(shopId, messageId, emoji);
        }
      } else {
        await chat.toggleReaction(conversation.id, messageId, emoji);
      }

      // Socket sync
      if (socket && isConnected) {
        socket.emit('chat:reaction', {
          to: conversation.room_name,
          messageId,
          emoji,
          userId: user?.id
        });
      }
    } catch (error) {
      console.error('Failed to react:', error);
      // Optional: rollback state on failure
    }
  };

  const handleRecall = async (message: ChatMessage) => {
    try {
      const isShopRoom = (conversation.room_name && conversation.room_name.includes('-shop')) || conversation.id === -1;
      
      if (isShopRoom) {
        // Extract shopId from message or room_name
        let shopId = message.shop_id;
        if (!shopId && conversation.room_name) {
          const match = conversation.room_name.match(/-shop(\d+)$/);
          if (match) {
            shopId = parseInt(match[1], 10);
          }
        }
        
        if (shopId) {
          await chat.deleteShopMessage(shopId, message.id);
        } else {
          // If we can't find shopId, maybe the backend endpoint works with just conversationId if it's not -1
          if (conversation.id !== -1) {
             await chat.deleteMessage(conversation.id, message.id);
          } else {
            throw new Error('Could not determine shop ID for message recall');
          }
        }
      } else {
        await chat.deleteMessage(conversation.id, message.id);
      }
      
      setMessages(prev => prev.filter(m => m.id !== message.id));
      if (socket && isConnected) {
        socket.emit('chat:message:deleted', { roomName: conversation.room_name, messageId: message.id });
      }
    } catch (error) {
      console.error('Failed to recall message:', error);
      alert('Không thể thu hồi tin nhắn. Vui lòng thử lại sau.');
    }
  };

  const handlePin = async (message: ChatMessage) => {
    try {
      const isShopRoom = (conversation.room_name && conversation.room_name.includes('-shop')) || conversation.id === -1;
      
      if (isShopRoom) {
        // Extract shopId from message or room_name
        let shopId = message.shop_id;
        if (!shopId && (conversation.room_name || roomName)) {
          const effectiveRoom = conversation.room_name || roomName;
          const match = effectiveRoom.match(/-shop(\d+)$/);
          if (match) {
            shopId = parseInt(match[1], 10);
          }
        }
        
        if (shopId) {
          await chat.pinShopMessage(shopId, message.id);
        } else {
          throw new Error('Could not determine shop ID for pinning');
        }
      } else {
        await chat.pinMessage(conversation.id, message.id);
      }
      
      // Update local state
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, is_pinned: !m.is_pinned } : m
      ));

      if (socket && isConnected) {
        socket.emit('chat:pin', { roomName: conversation.room_name, messageId: message.id });
      }
    } catch (error) {
      console.error('Failed to pin message:', error);
      alert('Không thể ghim tin nhắn. Vui lòng thử lại sau.');
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
  const displayName = getDisplayName(conversation.other_user, isShopRoom ? 'Khách hàng' : 'Người dùng');

  return (
    <div className="flex flex-col h-full bg-white shadow-[0_0_50px_-12px_rgba(0,0,0,0.05)]">
      {/* Chat Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {/* Avatar Area */}
          {isShopRoom ? (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl flex-shrink-0 shadow-lg shadow-indigo-200 text-white font-black">
              🏪
            </div>
          ) : (
            <div className="relative group">
              <UserAvatar
                name={displayName}
                avatarUrl={conversation.other_user?.avatar}
                size={48}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-lg text-slate-800 tracking-tight truncate leading-tight">
              {isShopRoom ? 'Tin nhắn cửa hàng' : displayName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase truncate">
                {isShopRoom ? displayName : (conversation.other_user?.email || 'Đang hoạt động')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <VideoCallButton
            conversation={conversation}
            onVideoCallClick={handleVideoCallClick}
            isCallActive={isCallActive}
          />
        </div>
      </div>
      
      {/* Pinned Messages Bar */}
      {messages.some(m => m.is_pinned) && (
        <PinnedMessagesBar 
          pinnedMessages={messages.filter(m => m.is_pinned)} 
          onScrollTo={scrollToMessage}
          onUnpin={handlePin}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-2 bg-[#F8FAFC]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-4xl mb-4 grayscale opacity-50">💬</div>
            <p className="text-slate-500 font-bold italic tracking-tight">
              Gửi một lời chào để bắt đầu cuộc trò chuyện!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            
            const isSameSenderAsPrev = !!prevMessage && (
              (message.is_mine && prevMessage.is_mine) || 
              (!message.is_mine && !prevMessage.is_mine && message.sender?.id === prevMessage.sender?.id)
            );
            
            const isSameSenderAsNext = !!nextMessage && (
              (message.is_mine && nextMessage.is_mine) || 
              (!message.is_mine && !nextMessage.is_mine && message.sender?.id === nextMessage.sender?.id)
            );
            
            const timeDiff = prevMessage 
              ? new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() 
              : Infinity;
            
            const nextTimeDiff = nextMessage 
              ? new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() 
              : Infinity;
            
            const isWithinGroupTime = timeDiff <= 5 * 60 * 1000; // 5 minutes
            const isGrouped = !!isSameSenderAsPrev && isWithinGroupTime;
            const showTimeSeparator = timeDiff > 5 * 60 * 1000;

            // In Zalo style, metadata (timestamp/status) is only shown for the last message in a cluster
            // A message is "last in cluster" if the next message is different sender OR next message is > 5 mins away
            const showMeta = !isSameSenderAsNext || nextTimeDiff > 5 * 60 * 1000;

            return (
              <div key={message.id} id={`message-${message.id}`} className="scroll-mt-20">
                {showTimeSeparator && (
                  <div className="flex items-center justify-center my-6">
                    <div className="px-3 py-1 bg-slate-200/50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                )}
                <ChatBubble 
                  message={message}
                  isGrouped={isGrouped}
                  onReply={(msg) => setReplyingTo(msg)}
                  onReact={handleReact}
                  onRecall={handleRecall}
                  onPin={handlePin}
                  onScrollToMessage={scrollToMessage}
                  showMeta={showMeta}
                />
              </div>
            );
          })}
        </div>
      )}
        
        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="flex items-center gap-2 mt-4 ml-2 animate-pulse">
            <div className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-xs text-slate-400">...</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              {displayName} đang nhập...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Container */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
        <MessageReplyPreview 
          message={replyingTo} 
          onClear={() => setReplyingTo(null)} 
        />
        <form onSubmit={handleSendWithImages} className="max-w-5xl mx-auto">
          {imagePreviewUrls.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-sm" />
                  <button
                    type="button"
                    onClick={() => removeSelectedImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                <span className="flex items-center gap-2">
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Đang chuẩn bị file...
                </span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Aa"
                className="w-full pl-5 pr-12 py-3 bg-slate-100/80 border-none focus:ring-2 focus:ring-[#0068FF]/20 rounded-2xl font-medium text-slate-800 placeholder-slate-400 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={sending || isUploading || (!newMessage.trim() && selectedImages.length === 0)}
                className="absolute right-2 p-2.5 bg-[#0068FF] hover:bg-[#005AE0] text-white rounded-xl shadow-lg shadow-blue-200 disabled:opacity-30 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
                {isConnected ? 'Đã kết nối' : 'Đang thử kết nối lại...'}
              </span>
            </div>
          </div>
        </form>
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
