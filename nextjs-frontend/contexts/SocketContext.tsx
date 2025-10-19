'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onNewMessage: (callback: (message: ChatMessage) => void) => void;
  offNewMessage: (callback: (message: ChatMessage) => void) => void;
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
    const newSocket = io(socketUrl);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);

      // Register user with socket server
      newSocket.emit('chat:register', { userId: user.id });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  const onNewMessage = (callback: (message: ChatMessage) => void) => {
    if (socket) {
      socket.on('new:message', callback);
    }
  };

  const offNewMessage = (callback: (message: ChatMessage) => void) => {
    if (socket) {
      socket.off('new:message', callback);
    }
  };

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
