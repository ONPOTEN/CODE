'use client';

import { Conversation } from '@/lib/api';
import { formatDistanceToNow } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: number | null;
  onSelectConversation: (conversationId: number) => void;
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No conversations yet. Start chatting with your friends!
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelectConversation(conversation.id)}
          className={`w-full p-4 text-left hover:bg-white transition-colors ${
            selectedConversationId === conversation.id ? 'bg-blue-50' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-gray-900">
              {conversation.room_name && conversation.room_name.includes('-shop') ? (
                <div>
                  <span>🏪 Shop Message</span>
                  <div className="text-sm font-normal text-gray-600 mt-1">
                    {conversation.other_user.name}
                  </div>
                </div>
              ) : (
                conversation.other_user.name
              )}
            </h3>
            {conversation.last_message && (
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(conversation.last_message.created_at)}
              </span>
            )}
          </div>

          {conversation.last_message ? (
            <p className="text-sm text-gray-600 truncate">
              {conversation.last_message.is_mine && 'You: '}
              {conversation.last_message.message}
            </p>
          ) : (
            <p className="text-sm text-gray-600 italic">
              {conversation.room_name && conversation.room_name.includes('-shop') ? (
                'No messages yet'
              ) : (
                'No recent messages'
              )}
            </p>
          )}

          {conversation.unread_count > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-gray-900 bg-blue-600 rounded-full">
                {conversation.unread_count}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
