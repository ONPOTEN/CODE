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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Phòng chủ trì</h1>
          <p className="text-gray-600">
            Bạn đang chủ trì. Gửi liên kết dưới đây để mời người tham gia.
          </p>
          <p className="text-sm text-gray-500 mt-2">Trạng thái: {connectionStatus}</p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Local Video */}
          <div className="bg-grey-200 rounded-lg shadow-xl overflow-hidden border-4 border-purple-400">
            <div className="relative bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-blue-500 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">
                Chủ trì (Bạn)
              </div>
            </div>
          </div>

          {/* Remote Video */}
          <div className="bg-grey-200 rounded-lg shadow-xl overflow-hidden">
            {remoteStream ? (
              <div className="relative bg-black">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-500 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">
                  Người tham gia
                </div>
              </div>
            ) : (
              <div className="bg-blue-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-600">
                    {connectionStatus === 'waiting' ? (
                      <>
                        <p className="text-lg">Đang đợi người tham gia...</p>
                        <p className="text-sm mt-2">Chia sẻ liên kết để mời người khác</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">Đã kết nối người tham gia</p>
                        <p className="text-sm mt-2">Đang bắt đầu video...</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shareable Link Section */}
        <div className="bg-grey-200 rounded-lg shadow-lg p-6 mb-8 border-l-4 border-purple-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Mời người tham gia</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="flex-1 px-4 py-2 bg-blue-500 border border-gray-300 rounded-lg text-gray-700"
            />
            <button
              onClick={copyToClipboard}
              className="bg-blue-500 hover:bg-blue-700 text-gray-900 font-bold py-2 px-6 rounded-lg transition"
            >
              Sao chép liên kết
            </button>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mb-8">
          {!callActive && remoteSocketId && (
            <button
              onClick={initiateCall}
              className="bg-grey-2000 hover:bg-blue-500 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105"
            >
              Bắt đầu gọi
            </button>
          )}

          {callActive && (
            <button
              onClick={endCall}
              className="bg-grey-2000 hover:bg-blue-500 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105"
            >
              Kết thúc gọi
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className="bg-white0 hover:bg-blue-500 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition"
          >
            Rời phòng
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-grey-200 rounded-lg shadow-lg p-6 text-gray-700">
          <h2 className="text-lg font-semibold mb-4">Thông tin phiên</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-purple-600">Email chủ trì:</span>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div>
              <span className="font-semibold text-blue-600">Người tham gia:</span>
              <p className="text-gray-600">{remoteUser?.email || 'Đang đợi...'}</p>
            </div>
            <div>
              <span className="font-semibold">Luồng nội bộ:</span>
              <p className="text-gray-600">{localStream ? '✓ Hoạt động' : '✗ Không hoạt động'}</p>
            </div>
            <div>
              <span className="font-semibold">Luồng từ xa:</span>
              <p className="text-gray-600">{remoteStream ? '✓ Hoạt động' : '✗ Không hoạt động'}</p>
            </div>
            <div>
              <span className="font-semibold">Trạng thái gọi:</span>
              <p className="text-gray-600">{callActive ? '🟢 Đang gọi' : '⚫ Không gọi'}</p>
            </div>
            <div>
              <span className="font-semibold">Kết nối:</span>
              <p className="text-gray-600">{connectionStatus === 'connected' ? '🔗 Đã kết nối' : '⏳ Đang đợi'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
