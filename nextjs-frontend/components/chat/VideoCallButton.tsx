'use client';

import { useState } from 'react';
import { Conversation } from '@/lib/api';

interface VideoCallButtonProps {
  conversation: Conversation;
  onVideoCallClick: () => void;
  isCallActive?: boolean;
}

export default function VideoCallButton({
  conversation,
  onVideoCallClick,
  isCallActive = false,
}: VideoCallButtonProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <button
      onClick={onVideoCallClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
        transition-all duration-200
        ${
          isCallActive
            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      `}
      title={`Start video call with ${conversation.other_user.name}`}
    >
      {/* Video Camera Icon */}
      <svg
        className="w-5 h-5"
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
      <span className={`text-sm ${isHovering ? 'block' : 'hidden sm:block'}`}>
        {isCallActive ? 'End Call' : 'Video Call'}
      </span>
    </button>
  );
}
