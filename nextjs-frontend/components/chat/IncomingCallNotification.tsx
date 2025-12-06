'use client';

import { useEffect, useState } from 'react';
import { Conversation } from '@/lib/api';

interface IncomingCallNotificationProps {
  conversation: Conversation;
  isVisible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallNotification({
  conversation,
  isVisible,
  onAccept,
  onReject,
}: IncomingCallNotificationProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setAnimate(true);
      // Play notification sound if available
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(() => {
        // Sound play failed, no need to show error
      });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto" />

      {/* Notification Card */}
      <div
        className={`
          relative pointer-events-auto
          max-w-md w-full mx-4 rounded-2xl
          bg-gray-50 shadow-2xl overflow-hidden
          transform transition-all duration-300
          ${animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Animated Top Border */}
        <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 animate-pulse" />

        {/* Content */}
        <div className="p-6">
          {/* Call Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75" />
              <div className="relative w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Message */}
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
            Cuộc gọi video đến
          </h2>
          <p className="text-center text-gray-600 mb-6">
            <span className="font-semibold">{conversation.other_user.name}</span>
            <br />
            <span className="text-sm text-gray-500">{conversation.other_user.email}</span>
          </p>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onReject}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              Từ chối
            </button>
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1zm-4 21c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4.5-4H7V4h8v14z" />
              </svg>
              Chấp nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
