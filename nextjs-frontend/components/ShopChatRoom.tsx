'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  message: string;
  timestamp: string;
  isOwn: boolean;
}

interface ShopChatRoomProps {
  shopId: number;
  shopName: string;
  shopOwnerId: number;
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopChatRoom({
  shopId,
  shopName,
  shopOwnerId,
  isOwner,
  isOpen,
  onClose,
}: ShopChatRoomProps) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [roomJoined, setRoomJoined] = useState(false);

  // Room name format: "{userid}-shop{shopid}" (where userid is the customer's ID)
  const roomName = user ? `${user.id}-shop${shopId}` : '';

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join room and listen for messages
  useEffect(() => {
    if (!socket || !isOpen || !user || !roomName) {
      return;
    }

    console.log('[ShopChatRoom] Joining room:', roomName);

    // Join the chat room
    socket.emit('join:shop:chat', {
      userId: user.id,
      shopId: shopId,
      shopOwnerId: shopOwnerId,
      roomName: roomName,
      userName: user.display_name || user.name,
    });

    const handleChatMessage = (data: any) => {
      console.log('[ShopChatRoom] Received chat message:', data);

      if (data.shopId === shopId) {
        const newMessage: ChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          senderId: data.senderId,
          senderName: data.senderName,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          isOwn: data.senderId === user.id,
        };

        console.log('[ShopChatRoom] Adding message to state:', newMessage);
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    socket.on('shop:chat:message', handleChatMessage);
    setRoomJoined(true);

    return () => {
      console.log('[ShopChatRoom] Leaving room:', roomName);
      socket.off('shop:chat:message', handleChatMessage);
      socket.emit('leave:shop:chat', {
        userId: user.id,
        shopId: shopId,
        roomName: roomName,
      });
      setRoomJoined(false);
    };
  }, [socket, isOpen, user, shopId, shopOwnerId, roomName]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || !socket || !user) {
      return;
    }

    setLoading(true);

    try {
      // Emit the chat message
      socket.emit('shop:chat:message', {
        shopId,
        shopName,
        shopOwnerId,
        userId: user.id,
        userName: user.display_name || user.name,
        message: inputMessage.trim(),
        roomName,
        timestamp: new Date().toISOString(),
      });

      console.log('[ShopChatRoom] Message sent:', inputMessage);

      // Add the message to local state immediately
      const sentMessage: ChatMessage = {
        id: `${Date.now()}-own`,
        senderId: user.id,
        senderName: user.display_name || user.name,
        message: inputMessage.trim(),
        timestamp: new Date().toISOString(),
        isOwn: true,
      };

      setMessages((prev) => [...prev, sentMessage]);
      setInputMessage('');
    } catch (error) {
      console.error('[ShopChatRoom] Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Chat with {isOwner ? 'Customer' : shopName}</h2>
            <p className="text-xs text-gray-600">Room: {roomName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-start gap-2">
            <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-yellow-800">Not connected to Socket.IO - messages may not be delivered</p>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500 font-medium">No messages yet</p>
                <p className="text-xs text-gray-400">Start a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.isOwn
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                    }`}
                  >
                    {!msg.isOwn && (
                      <p className="text-xs font-medium text-gray-600 mb-1">{msg.senderName}</p>
                    )}
                    <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={loading || !isConnected}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim() || !isConnected}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
