'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  initializeSocket,
  getSocket,
  joinGroupChat,
  leaveGroupChat,
  sendGroupMessage,
  onGroupMessage,
  onGroupUserJoined,
  onGroupUserLeft,
  onGroupUserTyping,
  emitGroupUserTyping,
  disconnectSocket,
} from '@/lib/socketClient';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isOwn: boolean;
}

interface GroupChatProps {
  groupId: number;
  groupName: string;
  onClose: () => void;
}

export default function GroupChat({ groupId, groupName, onClose }: GroupChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      // Initialize socket connection
      initializeSocket();
      setIsLoading(false);

      // Join group chat
      joinGroupChat(groupId, user.id);

      // Listen for messages
      onGroupMessage((data) => {
        const messageId = `${data.userId}-${data.timestamp}`;
        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            userId: data.userId,
            username: data.username,
            avatar: data.avatar,
            message: data.message,
            timestamp: data.timestamp,
            isOwn: data.userId === user.id,
          },
        ]);
      });

      // Listen for user joined
      onGroupUserJoined((data) => {
        setOnlineUsers((prev) => new Set([...prev, data.userId]));
      });

      // Listen for user left
      onGroupUserLeft((data) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      // Listen for typing indicators
      onGroupUserTyping((data) => {
        if (data.userId === user.id) return;

        if (data.isTyping) {
          setTypingUsers((prev) => new Map(prev).set(data.userId, data.username));
        } else {
          setTypingUsers((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        }
      });

      return () => {
        leaveGroupChat(groupId, user.id);
      };
    } catch (err: any) {
      setError(err.message || 'Failed to connect to chat');
      setIsLoading(false);
    }
  }, [user, groupId]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !user) return;

    try {
      sendGroupMessage(groupId, inputValue, user.id);
      setInputValue('');

      // Send typing stopped event
      emitGroupUserTyping(groupId, user.id, false);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    if (user) {
      emitGroupUserTyping(groupId, user.id, true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to send typing stopped after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        emitGroupUserTyping(groupId, user.id, false);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-96 md:h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{groupName}</h2>
            <p className="text-xs text-gray-600">Group Chat</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-center">
              <div>
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {!msg.isOwn && msg.avatar && (
                  <img
                    src={msg.avatar}
                    alt={msg.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                )}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.isOwn
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-900 rounded-bl-none'
                  }`}
                >
                  {!msg.isOwn && <p className="text-xs font-semibold mb-1">{msg.username}</p>}
                  <p className="text-sm break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-600'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <div className="flex gap-3 items-center text-gray-600 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>
                {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-300 p-4 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
