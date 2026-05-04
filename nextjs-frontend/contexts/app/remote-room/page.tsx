'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useVideoPeer } from '@/hooks/useVideoPeer';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RemoteRoom() {
  const { user } = useAuth();
  const { socket, onUserJoined, offUserJoined, onCallEnd, offCallEnd } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomId = searchParams.get('room') || 'host-room';
  const [remoteUser, setRemoteUser] = useState<any>(null);
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [isWaitingForInvite, setIsWaitingForInvite] = useState(true);

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

  // Handle user join
  const handleUserJoined = (data: any) => {
    console.log('Host user joined:', data);
    setRemoteUser(data);
    setRemoteSocketId(data.id);
    setConnectionStatus('connected');
    setIsWaitingForInvite(false);
  };

  // Handle call end
  const handleCallEnd = () => {
    console.log('Call ended');
    setConnectionStatus('connected');
  };

  useEffect(() => {
    onUserJoined(handleUserJoined);
    onCallEnd(handleCallEnd);

    return () => {
      offUserJoined(handleUserJoined);
      offCallEnd(handleCallEnd);
    };
  }, [onUserJoined, offUserJoined, onCallEnd, offCallEnd]);

  // Join remote room on mount
  useEffect(() => {
    if (socket && user?.email) {
      socket.emit('room:join', {
        email: user.email,
        room: roomId,
      });
    }
  }, [socket, user, roomId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Participant Room</h1>
          <p className="text-gray-600">
            You have been invited to join a video call.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Status: <span className="font-semibold">{connectionStatus}</span>
          </p>
        </div>

        {/* Connection Waiting State */}
        {isWaitingForInvite && (
          <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <p className="text-blue-800 font-semibold">
              Waiting for the host to join the call...
            </p>
            <p className="text-blue-600 text-sm mt-2">
              Please wait while the host gets ready. The video feed will start automatically.
            </p>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Local Video */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden border-4 border-teal-400">
            <div className="relative bg-black aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Participant (You)
              </div>
            </div>
          </div>

          {/* Remote Video (Host) */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {remoteStream ? (
              <div className="relative bg-black aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Host
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400">
                    {isWaitingForInvite ? (
                      <>
                        <div className="mb-4">
                          <div className="inline-block">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                          </div>
                        </div>
                        <p className="text-lg">Connecting...</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">Host video will appear here</p>
                        <p className="text-sm mt-2">Waiting for host to start the call</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mb-8">
          {!callActive && remoteSocketId && !isWaitingForInvite && (
            <button
              onClick={initiateCall}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105"
            >
              Accept Call
            </button>
          )}

          {callActive && (
            <button
              onClick={endCall}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105"
            >
              End Call
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition"
          >
            Leave Room
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-white rounded-lg shadow-lg p-6 text-gray-700">
          <h2 className="text-lg font-semibold mb-4">Session Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-teal-600">Your Email:</span>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div>
              <span className="font-semibold text-indigo-600">Host:</span>
              <p className="text-gray-600">{remoteUser?.email || 'Waiting...'}</p>
            </div>
            <div>
              <span className="font-semibold">Local Stream:</span>
              <p className="text-gray-600">{localStream ? '✓ Active' : '✗ Inactive'}</p>
            </div>
            <div>
              <span className="font-semibold">Remote Stream:</span>
              <p className="text-gray-600">{remoteStream ? '✓ Active' : '✗ Inactive'}</p>
            </div>
            <div>
              <span className="font-semibold">Call Status:</span>
              <p className="text-gray-600">{callActive ? '🟢 Active' : '⚫ Inactive'}</p>
            </div>
            <div>
              <span className="font-semibold">Connection:</span>
              <p className="text-gray-600">{connectionStatus === 'connected' ? '🔗 Connected' : '⏳ Waiting'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
