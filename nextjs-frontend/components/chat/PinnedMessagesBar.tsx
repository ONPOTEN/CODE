import React from 'react';
import { ChatMessage } from '../../lib/api';

interface PinnedMessagesBarProps {
  pinnedMessages: ChatMessage[];
  onScrollTo: (messageId: number) => void;
  onUnpin: (message: ChatMessage) => void;
}

const PinnedMessagesBar: React.FC<PinnedMessagesBarProps> = ({ 
  pinnedMessages, 
  onScrollTo, 
  onUnpin 
}) => {
  if (pinnedMessages.length === 0) return null;

  const lastPinned = pinnedMessages[pinnedMessages.length - 1];

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center px-4 py-2 z-10 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="mr-3 text-indigo-600 bg-indigo-50 p-1.5 rounded-lg">
        <svg className="w-4 h-4 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M15 2H5C3.89543 2 3 2.89543 3 4V14C3 15.1046 3.89543 16 5 16H8L10 18L12 16H15C16.1046 16 17 15.1046 17 14V4C17 2.89543 16.1046 2 15 2Z" />
        </svg>
      </div>
      
      <div 
        className="flex-1 min-w-0 cursor-pointer group"
        onClick={() => onScrollTo(lastPinned.id)}
      >
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
            Tin nhắn đã ghim
          </p>
          {pinnedMessages.length > 1 && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
              +{pinnedMessages.length - 1}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-slate-800 truncate leading-tight group-hover:text-indigo-600 transition-colors">
          {lastPinned.message}
        </p>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <button 
          onClick={() => onUnpin(lastPinned)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
          title="Bỏ ghim"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PinnedMessagesBar;
