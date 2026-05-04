'use client';

import { ChatMessage } from '@/lib/api';

interface MessageReplyPreviewProps {
  message: ChatMessage | null;
  onClear: () => void;
}

export default function MessageReplyPreview({ message, onClear }: MessageReplyPreviewProps) {
  if (!message) return null;

  return (
    <div className="mx-6 mb-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between group">
      <div className="flex-1 min-w-0 border-l-4 border-[#0068FF] pl-3">
        <p className="text-[11px] font-bold text-[#0068FF] uppercase tracking-widest mb-0.5">
          Đang trả lời {message.is_mine ? 'chính mình' : message.sender?.name}
        </p>
        <p className="text-[13px] text-slate-600 truncate opacity-80 italic">
          {message.message.replace(/\[IMAGE\].*?\[\/IMAGE\]/g, '📷 Hình ảnh')}
        </p>
      </div>
      <button 
        onClick={onClear}
        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
        title="Bỏ qua"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
