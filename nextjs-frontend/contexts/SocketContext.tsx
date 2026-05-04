'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { ChatMessage } from '@/lib/api';

export interface VideoCallEvent {
  from?: string;
  to?: string;
  offer?: RTCSessionDescription;
  ans?: RTCSessionDescription;
  email?: string;
  id?: string;
}

export interface ShopMessage {
  shopId: number;
  shopName: string;
  shopOwnerId: number;
  userId: number;
  userName: string;
  message: string;
  roomName: string;
  timestamp: string;
}

export interface RealtimeNotification {
  id: number;
  userid: number;
  ownid: number;
  type: 'comment' | 'like' | 'message' | 'follow' | 'mention' | 'share';
  posttype: string;
  postid: number;
  content: string;
  status: number;
  created_at: string;
  sender_id?: number;
  recipient_id?: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onNewMessage: (callback: (message: ChatMessage) => void) => void;
  offNewMessage: (callback: (message: ChatMessage) => void) => void;
  onShopMessage: (callback: (message: ShopMessage) => void) => void;
  offShopMessage: (callback: (message: ShopMessage) => void) => void;
  // Notification event handlers
  onNewNotification: (callback: (notification: RealtimeNotification) => void) => void;
  offNewNotification: (callback: (notification: RealtimeNotification) => void) => void;
  // Custom emit function for debug messages
  emitDebugMessage: (eventName: string, data: any) => void;
  // Post comment event handlers
  onPostCommentAdded: (callback: (data: any) => void) => void;
  offPostCommentAdded: (callback: (data: any) => void) => void;
  // Video call event handlers
  onUserJoined: (callback: (data: VideoCallEvent) => void) => void;
  offUserJoined: (callback: (data: VideoCallEvent) => void) => void;
  onIncomingCall: (callback: (data: VideoCallEvent) => void) => void;
  offIncomingCall: (callback: (data: VideoCallEvent) => void) => void;
  onCallAccepted: (callback: (data: VideoCallEvent) => void) => void;
  offCallAccepted: (callback: (data: VideoCallEvent) => void) => void;
  onPeerNegoNeeded: (callback: (data: VideoCallEvent) => void) => void;
  offPeerNegoNeeded: (callback: (data: VideoCallEvent) => void) => void;
  onPeerNegoFinal: (callback: (data: VideoCallEvent) => void) => void;
  offPeerNegoFinal: (callback: (data: VideoCallEvent) => void) => void;
  onCallEnd: (callback: (data: VideoCallEvent) => void) => void;
  offCallEnd: (callback: (data: VideoCallEvent) => void) => void;
  onIceCandidate: (callback: (data: any) => void) => void;
  offIceCandidate: (callback: (data: any) => void) => void;
  // Typing indicator
  onTyping: (callback: (data: { userId: number; isTyping: boolean }) => void) => void;
  offTyping: (callback: (data: { userId: number; isTyping: boolean }) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to Socket.IO server
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    console.log('[SocketContext] Attempting to connect to:', socketUrl);

    try {
      const newSocket = io(socketUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'], // Try websocket first, then fallback to polling
        secure: true,
      });

      newSocket.on('connect', () => {
        console.log('[SocketContext] Connected successfully:', newSocket.id);
        console.log('[SocketContext] User ID for registration:', user.id);

        setIsConnected(true);

        // Register user with socket server
        // This is CRITICAL - without this, the server cannot send notifications to this user
        newSocket.emit('chat:register', { userId: user.id });
        console.log('[SocketContext] Registered user with socket:', {
          userId: user.id,
          socketId: newSocket.id,
          timestamp: new Date().toISOString(),
        });
      });

      newSocket.on('disconnect', () => {
        console.log('[SocketContext] Disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('[SocketContext] Connection error:', error);
        setIsConnected(false);
      });

      // Debug: Log ALL events received
      newSocket.onAny((eventName, ...args) => {
        console.log('[SocketContext] Event Received:', eventName, args);

        // Specifically log post:comment-added events
        if (eventName === 'post:comment-added') {
          console.log('[SocketContext] post:comment-added Received:', args[0]);
        }
      });

      // Specifically log new:message events
      newSocket.on('new:message', (message) => {
        console.log('[SocketContext] new:message Event:', message);
      });

      // Log new:notification events
      newSocket.on('new:notification', (notification) => {
        console.log('[SocketContext] new:notification Event:', notification);
      });

      setSocket(newSocket);

      return () => {
        console.log('[SocketContext] Cleaning up socket connection');
        newSocket.disconnect();
      };
    } catch (error) {
      console.error('[SocketContext] Failed to initialize Socket.IO:', error);
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

  const onNewMessage = useCallback((callback: (message: ChatMessage) => void) => {
    if (socket) {
      console.log('🎯 Attaching new:message listener in onNewMessage');
      socket.on('new:message', callback);
    } else {
      console.warn('⚠️ Cannot attach listener - socket is null');
    }
  }, [socket]);

  const offNewMessage = useCallback((callback: (message: ChatMessage) => void) => {
    if (socket) {
      console.log('🔴 Removing new:message listener in offNewMessage');
      socket.off('new:message', callback);
    }
  }, [socket]);

  // Shop message event handlers
  const onShopMessage = useCallback((callback: (message: ShopMessage) => void) => {
    if (socket) {
      console.log('🎯 Attaching shop:message listener in onShopMessage');
      socket.on('shop:message', callback);
    } else {
      console.warn('⚠️ Cannot attach listener - socket is null');
    }
  }, [socket]);

  const offShopMessage = useCallback((callback: (message: ShopMessage) => void) => {
    if (socket) {
      console.log('🔴 Removing shop:message listener in offShopMessage');
      socket.off('shop:message', callback);
    }
  }, [socket]);

  // Notification event handlers
  const onNewNotification = useCallback((callback: (notification: RealtimeNotification) => void) => {
    if (socket) {
      console.log('🎯 Attaching new:notification listener in onNewNotification');
      socket.on('new:notification', callback);
    } else {
      console.warn('⚠️ Cannot attach listener - socket is null');
    }
  }, [socket]);

  const offNewNotification = useCallback((callback: (notification: RealtimeNotification) => void) => {
    if (socket) {
      console.log('🔴 Removing new:notification listener in offNewNotification');
      socket.off('new:notification', callback);
    }
  }, [socket]);

  // Custom emit function for debug messages
  const emitDebugMessage = useCallback((eventName: string, data: any) => {
    if (socket) {
      console.log(`[SocketContext] Emitting debug message to server:`, { eventName, data });
      socket.emit(eventName, data);
    }
  }, [socket]);

  // Post comment event handlers - Listen for comments on owned posts
  const onPostCommentAdded = useCallback((callback: (data: any) => void) => {
    console.log('[SocketContext] onPostCommentAdded called');
    console.log('[SocketContext] Current user ID:', user?.id);
    console.log('[SocketContext] Socket connected:', !!socket);
    console.log('[SocketContext] Socket ID:', socket?.id);

    if (socket) {
      console.log('[SocketContext] Attaching post:comment-added listener');
      socket.on('post:comment-added', callback);
    } else {
      console.warn('[SocketContext] Cannot attach listener - socket is null');
    }
  }, [socket, user]);

  const offPostCommentAdded = useCallback((callback: (data: any) => void) => {
    if (socket) {
      console.log('[SocketContext] Removing post:comment-added listener');
      socket.off('post:comment-added', callback);
    }
  }, [socket]);

  // Video call event handlers
  const onUserJoined = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.on('user:joined', callback);
    }
  };

  const offUserJoined = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.off('user:joined', callback);
    }
  };

  const onIncomingCall = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.on('incoming:call', callback);
    }
  };

  const offIncomingCall = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.off('incoming:call', callback);
    }
  };

  const onCallAccepted = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.on('call:accepted', callback);
    }
  };

  const offCallAccepted = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.off('call:accepted', callback);
    }
  };

  const onPeerNegoNeeded = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.on('peer:nego:needed', callback);
    }
  };

  const offPeerNegoNeeded = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.off('peer:nego:needed', callback);
    }
  };

  const onPeerNegoFinal = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.on('peer:nego:final', callback);
    }
  };

  const offPeerNegoFinal = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.off('peer:nego:final', callback);
    }
  };

  const onCallEnd = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.on('call:end', callback);
    }
  };

  const offCallEnd = (callback: (data: VideoCallEvent) => void) => {
    if (socket) {
      socket.off('call:end', callback);
    }
  };

  const onIceCandidate = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('ice:candidate', callback);
    }
  };

  const offIceCandidate = (callback: (data: any) => void) => {
    if (socket) {
      socket.off('ice:candidate', callback);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onNewMessage,
        offNewMessage,
        onShopMessage,
        offShopMessage,
        onNewNotification,
        offNewNotification,
        emitDebugMessage,
        onPostCommentAdded,
        offPostCommentAdded,
        onUserJoined,
        offUserJoined,
        onIncomingCall,
        offIncomingCall,
        onCallAccepted,
        offCallAccepted,
        onPeerNegoNeeded,
        offPeerNegoNeeded,
        onPeerNegoFinal,
        offPeerNegoFinal,
        onCallEnd,
        offCallEnd,
        onIceCandidate,
        offIceCandidate,
        onTyping: (callback: (data: any) => void) => {
          if (socket) socket.on('chat:typing', callback);
        },
        offTyping: (callback: (data: any) => void) => {
          if (socket) socket.off('chat:typing', callback);
        },
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
