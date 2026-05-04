'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useVideoPeer } from '@/hooks/useVideoPeer';
import { useRouter } from 'next/navigation';

export default function HostRoom() {
  const { user } = useAuth();
  const { socket, onUserJoined, offUserJoined, onCallEnd, offCallEnd } = useSocket();
  const router = useRouter();

  const roomId = 'host-room';
  const [remoteUser, setRemoteUser] = useState<any>(null);
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('waiting');
  const [shareableLink, setShareableLink] = useState<string>('');

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
    console.log('Remote user joined:', data);
    setRemoteUser(data);
    setRemoteSocketId(data.id);
    setConnectionStatus('connected');
  };

  // Handle call end
  const handleCallEnd = () => {
    console.log('Call ended');
    setConnectionStatus('connected');
    setRemoteUser(null);
  };

  useEffect(() => {
    onUserJoined(handleUserJoined);
    onCallEnd(handleCallEnd);

    return () => {
      offUserJoined(handleUserJoined);
      offCallEnd(handleCallEnd);
    };
  }, [onUserJoined, offUserJoined, onCallEnd, offCallEnd]);

  // Join host room on mount
  useEffect(() => {
    if (socket && user?.email) {
      socket.emit('room:join', {
        email: user.email,
        room: roomId,
      });
    }
  }, [socket, user]);

  // Generate shareable link
  useEffect(() => {
    const link = `${window.location.origin}/remote-room?room=${roomId}`;
    setShareableLink(link);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Host Room</h1>
          <p className="text-gray-600">
            You are hosting. Send the link below to invite participants.
          </p>
          <p className="text-sm text-gray-500 mt-2">Status: {connectionStatus}</p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Local Video */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden border-4 border-purple-400">
            <div className="relative bg-black aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Host (You)
              </div>
            </div>
          </div>

          {/* Remote Video */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {remoteStream ? (
              <div className="relative bg-black aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Participant
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400">
                    {connectionStatus === 'waiting' ? (
                      <>
                        <p className="text-lg">Waiting for participant...</p>
                        <p className="text-sm mt-2">Share the link to invite someone</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">Participant connected</p>
                        <p className="text-sm mt-2">Starting video feed...</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shareable Link Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-purple-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Invite Participant</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
            />
            <button
              onClick={copyToClipboard}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mb-8">
          {!callActive && remoteSocketId && (
            <button
              onClick={initiateCall}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105"
            >
              Start Call
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
              <span className="font-semibold text-purple-600">Host Email:</span>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div>
              <span className="font-semibold text-blue-600">Participant:</span>
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
