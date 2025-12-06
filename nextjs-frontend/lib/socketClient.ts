import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let isInitializing = false;

export const initializeSocket = (token?: string) => {
  if (socket && socket.connected) {
    return socket;
  }

  if (isInitializing) {
    return socket;
  }

  isInitializing = true;
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  socket = io(socketUrl, {
    auth: token ? {
      token,
    } : undefined,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    isInitializing = false;
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
    isInitializing = false;
  });

  socket.on('error', (error) => {
    console.error('[Socket] Error:', error);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinGroupChat = (groupId: number, userId: number) => {
  const socket = getSocket();
  socket?.emit('join-group-chat', { groupId, userId });
};

export const leaveGroupChat = (groupId: number, userId: number) => {
  const socket = getSocket();
  socket?.emit('leave-group-chat', { groupId, userId });
};

export const sendGroupMessage = (
  groupId: number,
  message: string,
  userId: number,
  onAck?: (acked: boolean, messageId?: string) => void
) => {
  const socket = getSocket();

  console.log('[Socket] Sending group message:', {
    groupId,
    userId,
    messageLength: message.length,
    messagePreview: message.substring(0, 50),
    timestamp: new Date().toISOString(),
  });

  socket?.emit(
    'group-message',
    {
      groupId,
      message,
      userId,
      timestamp: new Date().toISOString(),
    },
    (response: any) => {
      console.log('[Socket] Acknowledgment received:', {
        success: response?.success,
        messageId: response?.data?.id,
        error: response?.error,
        fullResponse: response,
      });

      // Handle acknowledgment from server
      if (onAck) {
        const acked = response?.success === true;
        const messageId = response?.data?.id;
        onAck(acked, messageId);
      }
      if (response?.error) {
        console.error('[Socket] Message send error:', response.error);
      }
    }
  );
};

export const onGroupMessage = (
  callback: (data: {
    id?: string;
    userId: number;
    message: string;
    timestamp: string;
    username: string;
    avatar?: string;
  }) => void
) => {
  const socket = getSocket();
  socket?.on('group-message', callback);
};

export const offGroupMessage = () => {
  const socket = getSocket();
  socket?.off('group-message');
};

export const onGroupUserJoined = (callback: (data: { userId: number; username: string }) => void) => {
  const socket = getSocket();
  socket?.on('group-user-joined', callback);
};

export const onGroupUserLeft = (callback: (data: { userId: number; username: string }) => void) => {
  const socket = getSocket();
  socket?.on('group-user-left', callback);
};

export const onGroupUserTyping = (callback: (data: { userId: number; username: string; isTyping: boolean }) => void) => {
  const socket = getSocket();
  socket?.on('group-user-typing', callback);
};

export const emitGroupUserTyping = (groupId: number, userId: number, isTyping: boolean) => {
  const socket = getSocket();
  socket?.emit('group-user-typing', { groupId, userId, isTyping });
};

export const loadGroupMessageHistory = (
  groupId: number,
  page: number = 1,
  limit: number = 50,
  callback?: (data: any) => void
) => {
  const socket = getSocket();
  socket?.emit('group-message-history', { groupId, page, limit }, (response: any) => {
    if (callback) {
      callback(response);
    }
  });
};

export const onGroupMessageHistory = (
  callback: (data: { messages: any[]; total: number; page: number }) => void
) => {
  const socket = getSocket();
  socket?.on('group-message-history', callback);
};
