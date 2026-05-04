'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  initializeSocket,
  getSocket,
  joinGroupChat,
  leaveGroupChat,
  sendGroupMessage,
  onGroupMessage,
  offGroupMessage,
  onGroupUserJoined,
  offGroupUserJoined,
  onGroupUserLeft,
  offGroupUserLeft,
  onGroupUserTyping,
  offGroupUserTyping,
  emitGroupUserTyping,
} from '@/lib/socketClient';
import { useAuth } from '@/contexts/AuthContext';
import { groups, Group, auth, ApiException } from '@/lib/api';
import { GroupInvitationMessage } from '@/components/GroupInvitationMessage';

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isOwn: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
}

type VerificationStatus = 'loading' | 'verified' | 'unauthorized' | 'not-found' | 'error';

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [membershipDetails, setMembershipDetails] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const membershipCheckRef = useRef<boolean>(false);
  const messageCallbackRef = useRef<((data: any) => void) | null>(null);
  const userJoinedCallbackRef = useRef<((data: any) => void) | null>(null);
  const userLeftCallbackRef = useRef<((data: any) => void) | null>(null);
  const userTypingCallbackRef = useRef<((data: any) => void) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Verify user authentication and membership
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // Check if user is authenticated
        if (!user) {
          setVerificationStatus('unauthorized');
          setError('Please log in to access group chat');
          setIsLoading(false);
          return;
        }

        // Check if already verified
        if (membershipCheckRef.current) {
          return;
        }

        membershipCheckRef.current = true;
        const groupId = parseInt(roomId);

        // Validate roomId
        if (isNaN(groupId)) {
          setVerificationStatus('not-found');
          setError('Invalid group ID');
          setIsLoading(false);
          return;
        }

        // Fetch group details
        try {
          const groupResponse = await groups.getById(groupId);
          setGroup(groupResponse.data);
        } catch (err: any) {
          if (err instanceof ApiException && err.status === 404) {
            setVerificationStatus('not-found');
            setError('Group not found');
          } else {
            setVerificationStatus('error');
            setError(err.message || 'Failed to load group');
          }
          setIsLoading(false);
          return;
        }

        // Check membership status
        try {
          const membershipResponse = await groups.checkMembership(groupId);

          if (!membershipResponse.is_member) {
            setVerificationStatus('unauthorized');
            setError('You are not a member of this group. Please join to access the chat.');
            setIsMember(false);
            setIsLoading(false);
            return;
          }

          // User is verified as a member
          setIsMember(true);
          setMembershipDetails(membershipResponse);

          // Get user role from context or localStorage
          if (user.role) {
            setUserRole(user.role);
          }

          setVerificationStatus('verified');
          setIsLoading(false);
        } catch (err: any) {
          if (err instanceof ApiException && err.status === 401) {
            // Token expired or invalid
            setVerificationStatus('unauthorized');
            setError('Your session has expired. Please log in again.');
            auth.logout();
          } else {
            setVerificationStatus('error');
            setError(err.message || 'Failed to verify membership');
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        setVerificationStatus('error');
        setError(err.message || 'An error occurred during verification');
        setIsLoading(false);
      }
    };

    verifyAccess();
  }, [roomId, user]);

  // Load message history from backend
  const loadMessageHistory = async () => {
    try {
      console.log('[Chat Debug] Loading message history from Laravel backend...', {
        groupId: parseInt(roomId),
      });

      const response = await groups.getMessages(parseInt(roomId), {
        per_page: 50,
        page: 1,
      });

      console.log('[Chat Debug] Message history response received:', {
        totalMessages: response.meta?.total || response.data?.length,
        perPage: response.meta?.per_page,
        currentPage: response.meta?.current_page,
        lastPage: response.meta?.last_page,
        dataCount: response.data?.length,
      });

      if (response.data && response.data.length > 0) {
        const historyMessages: ChatMessage[] = response.data.map((msg: any) => ({
          id: msg.id?.toString() || `${msg.user_id}-${msg.created_at}`,
          userId: msg.user_id,
          username: msg.user?.name || msg.username || 'Unknown',
          avatar: msg.user?.avatar || msg.user?.avatar_url,
          message: msg.message,
          timestamp: msg.created_at || msg.timestamp,
          isOwn: msg.user_id === user?.id,
          status: 'delivered' as const,
        }));

        console.log('[Chat Debug] ✓ Message history loaded and mapped:', {
          messagesLoaded: historyMessages.length,
          firstMessageTime: historyMessages[historyMessages.length - 1]?.timestamp,
          lastMessageTime: historyMessages[0]?.timestamp,
        });

        setMessages(historyMessages);
      } else {
        console.log('[Chat Debug] No message history found for this group');
      }
    } catch (err: any) {
      console.error('[Chat Debug] ✗ Failed to load message history:', {
        error: err?.message || err,
        status: err?.status,
        statusText: err?.statusText,
        groupId: parseInt(roomId),
      });
      // Don't set error - message history is optional
    }
  };

  // Initialize Socket.IO connection (only if verified and member)
  useEffect(() => {
    // Only initialize if user is verified as a member
    if (verificationStatus !== 'verified' || !isMember || !user) {
      return;
    }

    let isComponentMounted = true;

    const initializeChat = async () => {
      try {
        console.log('[Chat Debug] Initializing chat for group:', parseInt(roomId));

        // Load message history from backend first
        console.log('[Chat Debug] Step 1/4: Loading message history from database');
        await loadMessageHistory();

        if (!isComponentMounted) return;

        // Initialize socket connection
        const token = auth.getToken();

        if (!token) {
          console.error('[Chat Debug] No authentication token found');
          setError('Authentication token not found. Please log in again.');
          setVerificationStatus('unauthorized');
          return;
        }

        console.log('[Chat Debug] Step 2/4: Initializing Socket.IO connection');
        initializeSocket(token);

        if (!isComponentMounted) return;

        console.log('[Chat Debug] Step 3/4: Joining group chat room', {
          groupId: parseInt(roomId),
          userId: user.id,
        });

        // Join group chat room with user info
        joinGroupChat(parseInt(roomId), user.id);

        console.log('[Chat Debug] Step 4/4: Setting up event listeners');

        // Listen for messages - store callback in ref
        messageCallbackRef.current = (data) => {
          if (!isComponentMounted) return;

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
        };
        onGroupMessage(messageCallbackRef.current);

        // Listen for user joined - store callback in ref
        userJoinedCallbackRef.current = (data) => {
          if (!isComponentMounted) return;
          setOnlineUsers((prev) => new Set([...prev, data.userId]));
        };
        onGroupUserJoined(userJoinedCallbackRef.current);

        // Listen for user left - store callback in ref
        userLeftCallbackRef.current = (data) => {
          if (!isComponentMounted) return;
          setOnlineUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
        };
        onGroupUserLeft(userLeftCallbackRef.current);

        // Listen for typing indicators - store callback in ref
        userTypingCallbackRef.current = (data) => {
          if (!isComponentMounted || data.userId === user.id) return;

          if (data.isTyping) {
            setTypingUsers((prev) => new Map(prev).set(data.userId, data.username));
          } else {
            setTypingUsers((prev) => {
              const newMap = new Map(prev);
              newMap.delete(data.userId);
              return newMap;
            });
          }
        };
        onGroupUserTyping(userTypingCallbackRef.current);
      } catch (err: any) {
        if (isComponentMounted) {
          setError(err.message || 'Failed to connect to chat');
          setVerificationStatus('error');
        }
      }
    };

    initializeChat();

    return () => {
      isComponentMounted = false;

      // Clean up all event listeners using stored callbacks
      if (messageCallbackRef.current) {
        offGroupMessage(messageCallbackRef.current);
        messageCallbackRef.current = null;
      }
      if (userJoinedCallbackRef.current) {
        offGroupUserJoined(userJoinedCallbackRef.current);
        userJoinedCallbackRef.current = null;
      }
      if (userLeftCallbackRef.current) {
        offGroupUserLeft(userLeftCallbackRef.current);
        userLeftCallbackRef.current = null;
      }
      if (userTypingCallbackRef.current) {
        offGroupUserTyping(userTypingCallbackRef.current);
        userTypingCallbackRef.current = null;
      }

      // Leave the group chat room
      if (isMember && user) {
        leaveGroupChat(parseInt(roomId), user.id);
      }
    };
  }, [verificationStatus, isMember, user, roomId]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !user) return;

    const messageText = inputValue.trim();
    const messageId = `temp-${Date.now()}-${Math.random()}`;
    const timestamp = new Date().toISOString();

    // Add message with "sending" status
    const tempMessage: ChatMessage = {
      id: messageId,
      userId: user.id,
      username: user.username || user.display_name || 'Anonymous',
      avatar: user.avatar,
      message: messageText,
      timestamp,
      isOwn: true,
      status: 'sending',
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInputValue('');

    try {
      // Send message with acknowledgment callback
      sendGroupMessage(parseInt(roomId), messageText, user.id, async (acked, backendMessageId) => {
        console.log('[Chat Debug] Socket.IO acknowledgment received:', { acked, backendMessageId, messageId });

        if (acked) {
          console.log('[Chat Debug] Message acknowledged by Socket.IO, updating status to delivered');

          // Update message status to sent
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, id: backendMessageId || messageId, status: 'delivered' } : msg
            )
          );

          // Persist message to Laravel backend
          try {
            console.log('[Chat Debug] Starting persistence to Laravel backend...', {
              groupId: parseInt(roomId),
              userId: user.id,
              messageLength: messageText.length,
            });

            const response = await groups.saveMessage(parseInt(roomId), messageText, user.id);

            console.log('[Chat Debug] Message successfully persisted to Laravel backend:', {
              response,
              savedMessageId: response?.data?.id,
            });

            console.log('[Chat Debug] ✓ Complete flow: Socket.IO → Database');
          } catch (err: any) {
            // Capture full error details for debugging
            const errorDetails = {
              message: err?.message,
              status: err?.status || err?.response?.status,
              statusText: err?.statusText || err?.response?.statusText,
              responseData: err?.response?.data || err?.data,
              groupId: parseInt(roomId),
              userId: user.id,
              endpoint: `/api/v1/groups/${parseInt(roomId)}/messages`,
            };

            console.error('[Chat Debug] ✗ Failed to persist message to backend:', errorDetails);
            console.error('[Chat Debug] FULL ERROR OBJECT:', err);
            console.error('[Chat Debug] Check browser Network tab for POST request to /api/v1/groups/.../messages');

            setError('Message sent but failed to save. Check console for API error details.');
          }
        } else {
          console.error('[Chat Debug] Socket.IO acknowledgment failed');

          // Update message status to failed
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, status: 'failed' } : msg
            )
          );
          setError('Failed to send message. Please try again.');
        }
      });

      // Send typing stopped event
      emitGroupUserTyping(parseInt(roomId), user.id, false);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    if (user) {
      emitGroupUserTyping(parseInt(roomId), user.id, true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to send typing stopped after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        emitGroupUserTyping(parseInt(roomId), user.id, false);
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

  // Loading state with skeleton
  if (isLoading || verificationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Breadcrumb skeleton */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="max-w-6xl mx-auto h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Header skeleton */}
        <div className="bg-white border-b border-gray-300 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages skeleton */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-6xl mx-auto space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                {i % 2 === 0 && <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>}
                <div className={`${i % 2 === 0 ? 'max-w-xs lg:max-w-md' : 'max-w-xs lg:max-w-md'}`}>
                  <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
                {i % 2 !== 0 && <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Input skeleton */}
        <div className="bg-white border-t border-gray-300 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex gap-3">
              <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="px-6 py-3 h-10 bg-gray-200 rounded-lg animate-pulse w-20"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized - not authenticated
  if (verificationStatus === 'unauthorized') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-red-600">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-700 mb-6">{error || 'You do not have permission to access this chat.'}</p>
                <div className="space-x-4">
                  <Link
                    href="/login"
                    className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href={`/groups/${roomId}`}
                    className="inline-block px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                  >
                    Back to Group
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found - group doesn't exist
  if (verificationStatus === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-yellow-600">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Group Not Found</h2>
                <p className="text-gray-700 mb-6">{error || 'The group you are looking for does not exist or has been deleted.'}</p>
                <Link
                  href="/groups"
                  className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  View All Groups
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-red-600">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h2>
                <p className="text-gray-700 mb-6">{error || 'An error occurred while loading the chat. Please try again.'}</p>
                <div className="space-x-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Retry
                  </button>
                  <Link
                    href={`/groups/${roomId}`}
                    className="inline-block px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                  >
                    Back to Group
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verified - render chat interface
  if (verificationStatus !== 'verified') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-smoothPageEnter">
      {/* Breadcrumb Navigation */}
      <nav className="bg-gray-50 px-4 py-2 border-b border-gray-200 animate-slideUp" style={{ animationDelay: '50ms' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm">
          <Link
            href="/groups"
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            Groups
          </Link>
          <span className="text-gray-400">/</span>
          <Link
            href={`/groups/${roomId}`}
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            {group?.group_name || 'Group'}
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium">Chat</span>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-white border-b border-gray-300 shadow-sm sticky top-14 z-40 transition-all duration-300 animate-slideUp" style={{ animationDelay: '100ms' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/groups/${roomId}`}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              title="Back to group"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{group?.group_name || 'Group Chat'}</h1>
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                {onlineUsers.size} member{onlineUsers.size !== 1 ? 's' : ''} online • Verified member
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {membershipDetails && (
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  membershipDetails.is_member
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
                title="Your membership status"
              >
                {membershipDetails.is_member ? 'Active Member' : 'Pending Approval'}
              </span>
            )}
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.697 4.34L8.854.26c.147-.147.34-.22.56-.22.22 0 .413.073.56.22l3.157 4.08c.047.059.089.13.128.202.039.172.023.347-.05.51l-1.118 2.236a.75.75 0 001.34.672l1.118-2.236c.193-.387.243-.816.099-1.242-.144-.426-.42-.8-.835-1.012L9.73.544a2.059 2.059 0 00-2.913-.023L3.257 4.51c-.415.212-.69.586-.833 1.012-.144.426-.094.855.099 1.242l1.118 2.236a.75.75 0 001.34-.672L5.747 5.86c-.073-.163-.089-.338-.05-.51.039-.073.081-.144.128-.202zm2.906 7.922l-3.157-4.08c-.147-.148-.34-.22-.56-.22-.22 0-.413.072-.56.22L1.697 8.26c-.047.059-.089.13-.128.202-.039.172-.023.347.05.51l1.118 2.236a.75.75 0 01-1.34.672L.297 9.628c-.193-.387-.243-.816-.099-1.242.144-.426.42-.8.835-1.012l3.157-4.08a2.059 2.059 0 012.913.023l3.476 4.476c.415.212.69.586.833 1.012.144.426.094.855-.099 1.242l-1.118 2.236a.75.75 0 01-1.34-.672l1.118-2.236c.073-.163.089-.338.05-.51-.039-.073-.081-.144-.128-.202z" clipRule="evenodd" />
              </svg>
              Secure
            </span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-6xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-center py-12">
              <div>
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation by sending a message!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.isOwn ? 'justify-end' : 'justify-start'} animate-slideUp`}
              >
                {!msg.isOwn && (
                  <div className="flex-shrink-0">
                    {msg.avatar && (
                      <img
                        src={msg.avatar}
                        alt={msg.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <div
                    className={`${
                      msg.isOwn ? 'bg-blue-500 text-white rounded-lg rounded-br-none' : 'bg-white text-gray-900 rounded-lg rounded-bl-none border border-gray-300'
                    } px-4 py-3 shadow-sm`}
                  >
                    {!msg.isOwn && <p className="text-xs font-semibold mb-1 text-gray-600">{msg.username}</p>}
                    {msg.message.includes('[INVITATION]') ? (
                      <GroupInvitationMessage
                        messageContent={msg.message}
                        userId={user?.id}
                        onActionComplete={() => {
                          // Optionally refresh group info or close chat
                          console.log('Invitation action completed');
                        }}
                      />
                    ) : (
                      <p className="text-sm break-words">{msg.message}</p>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <p
                        className={`text-xs ${
                          msg.isOwn ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                      {msg.isOwn && msg.status && (
                        <div title={`Message status: ${msg.status}`}>
                          {msg.status === 'sending' && (
                            <svg className="w-4 h-4 text-blue-100 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          {msg.status === 'delivered' && (
                            <svg className="w-4 h-4 text-blue-100" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {msg.status === 'failed' && (
                            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {msg.isOwn && (
                  <div className="flex-shrink-0">
                    {msg.avatar && (
                      <img
                        src={msg.avatar}
                        alt={msg.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <div className="flex gap-3 items-center text-gray-600 text-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>
                {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-300 shadow-lg sticky bottom-0 animate-slideUp" style={{ animationDelay: '150ms' }}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
