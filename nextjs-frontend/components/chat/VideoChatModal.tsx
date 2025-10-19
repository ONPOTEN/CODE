'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useVideoPeer } from '@/hooks/useVideoPeer';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/lib/api';

interface VideoChatModalProps {
  isOpen: boolean;
  conversation: Conversation;
  onClose: () => void;
}

export default function VideoChatModal({
  isOpen,
  conversation,
  onClose,
}: VideoChatModalProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('initializing');
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState<string>('00:00');

  const {
    localStream,
    remoteStream,
    callActive,
    initiateCall,
    endCall,
  } = useVideoPeer({
    email: user?.email || '',
    remoteSocketId,
    onLocalStream: (stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    },
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    },
  });

  // Generate room name from conversation ID for consistency
  const roomName = `chat-call-${conversation.id}`;

  // Join video room on modal open
  useEffect(() => {
    if (isOpen && socket && user?.email) {
      setConnectionStatus('connecting');
      socket.emit('room:join', {
        email: user.email,
        room: roomName,
      });
    }
  }, [isOpen, socket, user?.email, roomName]);

  // Handle incoming user join
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data: any) => {
      console.log('User joined video chat:', data);
      setRemoteSocketId(data.id);
      setConnectionStatus('connected');
    };

    socket.on('user:joined', handleUserJoined);

    return () => {
      socket.off('user:joined', handleUserJoined);
    };
  }, [socket]);

  // Handle call end
  useEffect(() => {
    if (!socket) return;

    const handleCallEnd = () => {
      console.log('Remote user ended call');
      handleEndCall();
    };

    socket.on('call:end', handleCallEnd);

    return () => {
      socket.off('call:end', handleCallEnd);
    };
  }, [socket]);

  // Update call duration
  useEffect(() => {
    if (!callActive || !callStartTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setCallDuration(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [callActive, callStartTime]);

  const handleStartCall = async () => {
    try {
      setConnectionStatus('calling');
      setIsCaller(true);
      setCallStartTime(new Date());
      await initiateCall();
    } catch (error) {
      console.error('Failed to start call:', error);
      setConnectionStatus('error');
    }
  };

  const handleEndCall = () => {
    endCall();
    setIsCaller(false);
    setRemoteSocketId(null);
    setConnectionStatus('ready');
    setCallStartTime(null);
    setCallDuration('00:00');
  };

  const handleCloseModal = () => {
    if (callActive) {
      handleEndCall();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-96 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{conversation.other_user.name}</h2>
            <p className="text-sm text-blue-100">{conversation.other_user.email}</p>
          </div>
          <button
            onClick={handleCloseModal}
            className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Video Container */}
        <div className="bg-black p-4 space-y-4">
          {/* Status Bar */}
          <div className="flex justify-center items-center gap-4 text-white">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              callActive ? 'bg-green-600' :
              connectionStatus === 'connected' ? 'bg-blue-600' :
              connectionStatus === 'error' ? 'bg-red-600' :
              'bg-gray-600'
            }`}>
              {callActive ? `🟢 Call Active - ${callDuration}` :
               connectionStatus === 'connected' ? '🔗 Connected' :
               connectionStatus === 'connecting' ? '⏳ Connecting...' :
               connectionStatus === 'calling' ? '📞 Calling...' :
               connectionStatus === 'error' ? '❌ Error' :
               'Ready'}
            </div>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-2 gap-4 aspect-video">
            {/* Local Video */}
            <div className="bg-gray-900 rounded-lg overflow-hidden relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                You
              </div>
            </div>

            {/* Remote Video */}
            <div className="bg-gray-900 rounded-lg overflow-hidden relative">
              {remoteStream ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    {conversation.other_user.name}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {callActive ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Waiting for video...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-400 text-sm">
                        {connectionStatus === 'connected' ? 'Ready to call' : 'Connecting...'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!callActive && remoteSocketId && connectionStatus === 'connected' && (
              <button
                onClick={handleStartCall}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                Start Call
              </button>
            )}

            {callActive && (
              <button
                onClick={handleEndCall}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.72 5.71L19.71 8.7c.39.39.39 1.02 0 1.41l-2.34 2.34c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39.39 1.02 0 1.41l-2.99 2.99c-.39.39-1.02.39-1.41 0l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-2.34 2.34c-.39.39-1.02.39-1.41 0l-2.99-2.99c-.39-.39-.39-1.02 0-1.41l2.34-2.34c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-.39-1.02 0-1.41l2.99-2.99c.39-.39 1.02-.39 1.41 0l2.34 2.34c.39.39 1.02.39 1.41 0l2.34-2.34c.39-.39 1.02-.39 1.41 0z" />
                </svg>
                End Call
              </button>
            )}

            <button
              onClick={handleCloseModal}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-full transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
