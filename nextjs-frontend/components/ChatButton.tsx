'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { chat } from '@/lib/api';

interface ChatButtonProps {
  userId: number;
  userName: string;
}

export default function ChatButton({ userId, userName }: ChatButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartChat = async () => {
    try {
      setLoading(true);
      const conversation = await chat.getOrCreateConversation(userId);
      router.push(`/messages?conversation=${conversation.id}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
      alert('Failed to start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleStartChat}
      disabled={loading}
      className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Message
        </>
      )}
    </button>
  );
}
