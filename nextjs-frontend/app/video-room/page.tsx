'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useVideoPeer } from '@/hooks/useVideoPeer';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VideoRoom() {
  const { user } = useAuth();
  const { socket, onUserJoined, offUserJoined, onCallEnd, offCallEnd } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = searchParams.get('room') || 'default-room';
  const [remoteUser, setRemoteUser] = useState<any>(null);
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isHost, setIsHost] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('waiting');

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
    console.log('User joined:', data);
    setRemoteUser(data);
    setRemoteSocketId(data.id);
    setConnectionStatus('connected');
  };

  // Handle call end
  const handleCallEnd = () => {
    console.log('Call ended');
    setConnectionStatus('waiting');
  };

  useEffect(() => {
    onUserJoined(handleUserJoined);
    onCallEnd(handleCallEnd);

    return () => {
      offUserJoined(handleUserJoined);
      offCallEnd(handleCallEnd);
    };
  }, [onUserJoined, offUserJoined, onCallEnd, offCallEnd]);

  // Join room on mount
  useEffect(() => {
    if (socket && user?.email) {
      socket.emit('room:join', {
        email: user.email,
        room: roomId,
      });
    }
  }, [socket, user, roomId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Phòng gọi Video</h1>
          <p className="text-gray-600">
            Phòng: <span className="font-semibold text-indigo-600">{roomId}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">Trạng thái: {connectionStatus}</p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Local Video */}
          <div className="bg-grey-200 rounded-lg shadow-lg overflow-hidden">
            <div className="relative bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-gray-900 px-3 py-1 rounded-full text-sm">
                Bạn ({user?.email?.split('@')[0]})
              </div>
            </div>
          </div>

          {/* Remote Video */}
          <div className="bg-grey-200 rounded-lg shadow-lg overflow-hidden">
            {remoteStream ? (
              <div className="relative bg-black">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-gray-900 px-3 py-1 rounded-full text-sm">
                  {remoteUser?.email?.split('@')[0] || 'Người dùng từ xa'}
                </div>
              </div>
            ) : (
              <div className="bg-blue-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-600 mb-4">
                    {connectionStatus === 'waiting' ? (
                      <>
                        <p className="text-lg">Đang đợi người dùng từ xa...</p>
                        <p className="text-sm mt-2">Chia sẻ ID phòng này với bạn của bạn</p>
                      </>
                    ) : (
                      <p>Video từ xa sẽ hiển thị ở đây</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 justify-center flex-wrap">
          {!callActive && remoteSocketId && (
            <button
              onClick={initiateCall}
              className="bg-grey-2000 hover:bg-blue-500 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition"
            >
              Bắt đầu gọi
            </button>
          )}

          {callActive && (
            <button
              onClick={endCall}
              className="bg-grey-2000 hover:bg-blue-500 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition"
            >
              Kết thúc gọi
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className="bg-white0 hover:bg-blue-500 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition"
          >
            Thoát phòng
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-grey-200 rounded-lg shadow-lg p-6 text-gray-700">
          <h2 className="text-lg font-semibold mb-3">Thông tin phòng</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="font-semibold">Email của bạn:</span> {user?.email}
            </li>
            <li>
              <span className="font-semibold">Người dùng đã kết nối:</span>{' '}
              {remoteUser?.email || 'Không có'}
            </li>
            <li>
              <span className="font-semibold">Luồng nội bộ:</span>{' '}
              {localStream ? '✓ Hoạt động' : '✗ Không hoạt động'}
            </li>
            <li>
              <span className="font-semibold">Luồng từ xa:</span>{' '}
              {remoteStream ? '✓ Hoạt động' : '✗ Không hoạt động'}
            </li>
            <li>
              <span className="font-semibold">Trạng thái gọi:</span>{' '}
              {callActive ? '🟢 Đang gọi' : '⚫ Không gọi'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
