'use client';

import { Conversation } from '@/lib/api';
import { formatDistanceToNow } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: number | null;
  onSelectConversation: (conversationId: number) => void;
  isLoading?: boolean;
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  isLoading = false,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
        <p className="text-sm text-gray-600">Đang tải cuộc trò chuyện...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-gray-600 font-medium">Chưa có cuộc trò chuyện nào</p>
        <p className="text-sm text-gray-500 mt-1">Bắt đầu trò chuyện với bạn bè của bạn!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelectConversation(conversation.id)}
          className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
            selectedConversationId === conversation.id ? 'bg-gray-100 border-l-4 border-blue-600' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-gray-900">
              {conversation.room_name && conversation.room_name.includes('-shop') ? (
                <div>
                  <span>🏪 Tin nhắn cửa hàng</span>
                  <div className="text-sm font-normal text-gray-600 mt-1">
                    {conversation.other_user.name}
                  </div>
                </div>
              ) : (
                conversation.other_user.name
              )}
            </h3>
            {conversation.last_message && (
              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                {formatDistanceToNow(conversation.last_message.created_at)}
              </span>
            )}
          </div>

          {conversation.last_message ? (
            <p className="text-sm text-gray-600 truncate">
              {conversation.last_message.is_mine && 'Bạn: '}
              {conversation.last_message.message}
            </p>
          ) : (
            <p className="text-sm text-gray-600 italic">
              {conversation.room_name && conversation.room_name.includes('-shop') ? (
                'Chưa có tin nhắn'
              ) : (
                'Không có tin nhắn gần đây'
              )}
            </p>
          )}

          {conversation.unread_count > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {conversation.unread_count}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
