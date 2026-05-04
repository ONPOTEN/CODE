'use client';

import { useState } from 'react';
import { Conversation } from '@/lib/api';
import { formatDistanceToNow } from '@/lib/utils';
import Image from 'next/image';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: number | null;
  onSelectConversation: (conversationId: number) => void;
  isLoading?: boolean;
}

// Helper function to get the display name for a user
function getDisplayName(conversation: Conversation): string {
  if (!conversation.other_user?.name) {
    return `Người dùng ${conversation.other_user?.id || '?'}`;
  }
  return conversation.other_user.name;
}

// Helper function to get the initials for a user
function getInitials(name: string): string {
  if (!name || name.trim() === '') return '?';
  return name.trim().charAt(0).toUpperCase();
}

// Helper component for avatar with fallback
function UserAvatar({ name, avatarUrl, size = 48 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imageError, setImageError] = useState(false);

  const pixelSize = size === 48 ? 'w-12 h-12' : 'w-10 h-10';
  const textSize = size === 48 ? 'text-lg' : 'text-base';

  if (!avatarUrl || imageError) {
    return (
      <div className={`${pixelSize} rounded-[1rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ${textSize} font-black text-white shadow-lg shadow-indigo-100`}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div className={`${pixelSize} rounded-[1rem] overflow-hidden shadow-lg shadow-slate-200 border-2 border-white`}>
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        unoptimized={
          avatarUrl.startsWith('http://') ||
          !avatarUrl.includes('.centimet2.com')
        }
      />
    </div>
  );
}

const ConversationSkeleton = () => (
  <div className="p-4 flex gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex-shrink-0" />
    <div className="flex-1 space-y-3 pt-1">
      <div className="flex justify-between">
        <div className="h-4 w-24 bg-slate-100 rounded" />
        <div className="h-3 w-12 bg-slate-50 rounded" />
      </div>
      <div className="h-3 w-48 bg-slate-50 rounded" />
    </div>
  </div>
);

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  isLoading = false,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        {[...Array(6)].map((_, i) => <ConversationSkeleton key={i} />)}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50/30">
        <div className="w-16 h-16 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-3xl mb-4 grayscale opacity-40">📭</div>
        <h3 className="text-slate-800 font-black tracking-tight mb-1">Hộp thư trống</h3>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
          Bắt đầu trò chuyện với bạn bè của bạn ngay hôm nay!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-3 py-4 space-y-1">
      {conversations.map((conversation) => {
        const displayName = getDisplayName(conversation);
        const isShopRoom = conversation.room_name && conversation.room_name.includes('-shop');
        const isSelected = selectedConversationId === conversation.id;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`group w-full p-3.5 rounded-2xl text-left transition-all duration-300 relative overflow-hidden ${
              isSelected 
                ? 'bg-indigo-600 shadow-xl shadow-indigo-200 transform scale-[1.02] z-10' 
                : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
            }`}
          >
            {isSelected && (
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-12 h-12 bg-white/10 rounded-full blur-xl" />
            )}
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="flex-shrink-0 relative">
                {isShopRoom ? (
                  <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center text-2xl shadow-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}>
                    🏪
                  </div>
                ) : (
                  <UserAvatar
                    name={displayName}
                    avatarUrl={conversation.other_user?.avatar}
                    size={48}
                  />
                )}
                {/* Active Status Indicator */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${isSelected ? 'bg-emerald-400 border-indigo-600' : 'bg-emerald-500 border-white'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className={`font-black text-[15px] truncate tracking-tight transition-colors ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {isShopRoom ? (
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-600'}`} />
                        Shop: {displayName}
                      </span>
                    ) : (
                      displayName
                    )}
                  </h4>
                  {conversation.last_message && (
                    <span className={`text-[10px] font-black uppercase tracking-tighter flex-shrink-0 ml-2 pt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {formatDistanceToNow(conversation.last_message.created_at)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate font-medium leading-none ${isSelected ? 'text-indigo-50' : 'text-slate-500'}`}>
                    {conversation.last_message ? (
                      <>
                        <span className={`opacity-60 ${isSelected ? 'text-white' : 'text-slate-400'}`}>{conversation.last_message.is_mine && 'Bạn: '}</span>
                        {conversation.last_message.message}
                      </>
                    ) : (
                      <span className="italic opacity-60">Chưa có tin nhắn...</span>
                    )}
                  </p>
                  
                  {conversation.unread_count > 0 && !isSelected && (
                    <div className="flex-shrink-0">
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white shadow-lg shadow-rose-100">
                        {conversation.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
