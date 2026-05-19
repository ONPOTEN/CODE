'use client';

import { ChatMessage } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GroupInvitationMessage } from '@/components/GroupInvitationMessage';
import { useAuth } from '@/contexts/AuthContext';

interface ChatBubbleProps {
  message: ChatMessage;
  isGrouped: boolean;
  onReply?: (message: ChatMessage) => void;
  onReact?: (messageId: number, emoji: string) => void;
  onRecall?: (message: ChatMessage) => void;
  onPin?: (message: ChatMessage) => void;
  onScrollToMessage?: (messageId: number) => void;
  showMeta?: boolean;
}

export default function ChatBubble({ message, isGrouped, onReply, onReact, onRecall, onPin, onScrollToMessage, showMeta = true }: ChatBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [isMounted, setIsMounted] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleOpenMenu = (e: React.MouseEvent | React.TouchEvent) => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      
      // Calculate positions
      let top = rect.bottom + 8;
      let left: string | number = 'auto';
      let right: string | number = 'auto';
      
      // Prevent menu from going off-screen (bottom)
      if (top + 180 > window.innerHeight) {
        top = rect.top - 160; // Show above the bubble if not enough space below
      }

      if (message.is_mine) {
        right = window.innerWidth - rect.right;
        // Ensure menu doesn't go off-screen (left)
        if (window.innerWidth - (typeof right === 'number' ? right : 0) < 160) {
          right = 'auto';
          left = 16;
        }
      } else {
        left = rect.left;
        // Ensure menu doesn't go off-screen (right)
        if (rect.left + 160 > window.innerWidth) {
          left = 'auto';
          right = 16;
        }
      }

      setMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        left: left === 'auto' ? 'auto' : `${left}px`,
        right: right === 'auto' ? 'auto' : `${right}px`,
      });
      setShowMenu(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    touchTimerRef.current = setTimeout(() => {
      // Trigger menu with position calculation
      handleOpenMenu(e as any);
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 600);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleCopy = () => {
    const { text } = isImageMessage(message.message) 
      ? parseMessageContent(message.message) 
      : { text: message.message };
    
    navigator.clipboard.writeText(text || message.message);
    setShowMenu(false);
  };

  const handleRecallClick = () => {
    onRecall?.(message);
    setShowMenu(false);
  };

  const handlePinClick = () => {
    onPin?.(message);
    setShowMenu(false);
  };

  const handleContextReact = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowMenu(false);
  };

  const isImageMessage = (msg: string): boolean => {
    return msg.includes('[IMAGE]') && msg.includes('[/IMAGE]');
  };

  const parseMessageContent = (msg: string): { text: string; images: string[] } => {
    const images: string[] = [];
    const imageRegex = /\[IMAGE\](.*?)\[\/IMAGE\]/g;
    let match;

    while ((match = imageRegex.exec(msg)) !== null) {
      images.push(match[1]);
    }

    const text = msg.replace(imageRegex, '').trim();
    return { text, images };
  };

  const { text, images } = isImageMessage(message.message) 
    ? parseMessageContent(message.message) 
    : { text: message.message, images: [] };

  return (
    <div
      id={`message-bubble-${message.id}`}
      className={`flex flex-col ${message.is_mine ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-1' : 'mt-4'} group relative ${showMenu ? 'z-[9999]' : 'z-0'} transition-all`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Sender Name (only if not mine and not grouped) */}
      {!message.is_mine && !isGrouped && (
        <span className="text-[11px] font-bold text-slate-500 ml-12 mb-1 uppercase tracking-wider">
          {message.sender?.name || 'Người dùng'}
        </span>
      )}

      <div className={`flex items-end gap-2 max-w-[85%] lg:max-w-[70%] ${message.is_mine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!message.is_mine && (
          <div className="w-9 h-9 flex-shrink-0 mb-1">
            {!isGrouped ? (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#0068FF] to-[#0091FF] flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-100">
                {message.sender?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            ) : (
              <div className="w-9" />
            )}
          </div>
        )}

        <div className="flex flex-col">
          {/* Reply Context (Pretty Zalo Style) - Clickable to jump to origin */}
          {message.reply_to && (
            <div 
              onClick={() => onScrollToMessage?.(message.reply_to!.id)}
              className={`mb-[-12px] pb-5 pt-2.5 px-4 rounded-t-[1.25rem] text-[12px] relative overflow-hidden transition-all duration-300 cursor-pointer hover:brightness-95 active:scale-[0.99] ${
                message.is_mine 
                  ? 'bg-[#CBDFFF] text-[#0068FF] border-r-4 border-[#0068FF]' 
                  : 'bg-slate-50 text-slate-500 border-l-4 border-slate-300'
              }`}
              title="Đi tới tin nhắn gốc"
            >
              <div className="flex items-center gap-1.5 mb-0.5 opacity-80">
                <span className="font-black uppercase tracking-tight text-[10px]">
                  {message.reply_to?.sender_name}
                </span>
              </div>
              <p className="truncate font-medium opacity-90 leading-snug">
                {message.reply_to?.message.replace(/\[IMAGE\].*?\[\/IMAGE\]/g, '📷 Hình ảnh')}
              </p>
            </div>
          )}

          {/* Message Bubble Container */}
          <div className="relative" ref={bubbleRef}>
            {/* Long Press Action Overlay (Mobile) */}
            <div
              className={`relative px-4 py-3 shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] select-none ${
                message.is_mine
                  ? `bg-[#E1EFFF] text-slate-800 ${message.reply_to ? 'rounded-b-[1.25rem] rounded-tl-[1.25rem]' : 'rounded-[1.25rem] rounded-tr-sm'}`
                  : `bg-white text-slate-800 border border-slate-100 ${message.reply_to ? 'rounded-b-[1.25rem] rounded-tr-[1.25rem]' : 'rounded-[1.25rem] rounded-tl-sm'}`
              }`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart} 
              onMouseUp={handleTouchEnd}
              onDoubleClick={() => onReact?.(message.id, '❤️')}
              onContextMenu={(e) => {
                e.preventDefault();
                handleOpenMenu(e);
              }}
            >
              {/* Group Invitation */}
              {message.message.includes('[INVITATION]') ? (
                <GroupInvitationMessage
                  messageContent={message.message}
                  userId={user?.id}
                  onActionComplete={() => console.log('Invitation action completed')}
                />
              ) : (
                <>
                  {/* Plain Text with Show More toggle */}
                  {text && (
                    <>
                      <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed font-medium ${!isExpanded && text.length > 650 ? 'line-clamp-[12]' : ''}`}>
                        {text}
                      </p>
                      {text.length > 650 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                          }}
                          className="mt-2 text-indigo-600 hover:text-indigo-700 font-black text-xs uppercase tracking-widest hover:underline transition-all"
                        >
                          {isExpanded ? 'Thu gọn' : 'Xem thêm nội dung'}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Images */}
              {images.length > 0 && (
                <div className={`flex flex-wrap gap-2 ${text ? 'mt-2' : ''}`}>
                  {images.map((url, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <img 
                        src={url} 
                        alt="Shared content" 
                        className="max-w-full h-auto object-cover"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Message Info/Status */}
              {showMeta && (
                <div className={`mt-1 flex items-center gap-2 ${message.is_mine ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] font-bold text-slate-400 opacity-70">
                    {formatTime(message.created_at)}
                  </span>
                  {message.is_mine && (
                    <span className={`text-[10px] font-bold ${message.is_read ? 'text-[#0068FF]' : 'text-slate-300'}`}>
                      {message.is_read ? 'Đã xem' : 'Đã gửi'}
                    </span>
                  )}
                </div>
              )}
              {/* Combined Reaction Icon & Badge (Zalo Style) */}
              <div 
                className={`absolute -bottom-2 ${message.is_mine ? 'left-2' : 'right-2'} z-10 transition-all duration-200 group`}
                onMouseEnter={() => setShowReactionPicker(true)}
                onMouseLeave={() => setShowReactionPicker(false)}
              >
                {/* Reaction Picker Popover */}
                {showReactionPicker && (
                  <div className={`absolute -top-12 ${message.is_mine ? 'left-0' : 'right-0'} flex items-center gap-1.5 bg-white rounded-2xl p-1.5 shadow-xl border border-slate-100 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200 scale-105 origin-bottom z-[20]`}>
                    {['❤️', '👍', '😂', '😮', '😢'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReact?.(message.id, emoji);
                          setShowReactionPicker(false);
                        }}
                        className="hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-50 font-bold"
                      >
                        <span className="text-xl leading-none">{emoji}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* The Unified Reaction Button/Badge */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact?.(message.id, '❤️');
                  }}
                  className={`flex items-center bg-white rounded-full transition-all duration-200 shadow-sm border border-slate-100 hover:scale-110 active:scale-95 ${
                    (message.reactions_count || 0) > 0 
                      ? 'px-1.5 py-0.5 opacity-100' 
                      : 'w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100'
                  } ${message.my_reaction || showReactionPicker ? 'border-rose-100 bg-rose-50 shadow-md' : ''}`}
                >
                  {(message.reactions_count || 0) > 0 ? (
                    <>
                      <div className="flex items-center -space-x-1 mr-1">
                        {message.reactions?.slice(0, 3).map((emoji, i) => (
                          <span key={i} className="text-[12px] leading-none drop-shadow-sm">{emoji}</span>
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-slate-500 leading-none mr-0.5">{message.reactions_count}</span>
                    </>
                  ) : (
                    <svg className={`w-4 h-4 ${showReactionPicker ? 'text-rose-500' : 'text-slate-300'}`} fill={showReactionPicker ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Context Menu Backdrop and Panel */}
            {showMenu && isMounted && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[2147483646] overflow-hidden bg-black/10 backdrop-blur-[2px]"
                  onClick={() => setShowMenu(false)}
                />

                <div
                  className="fixed z-[2147483647] w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 ring-1 ring-black/5 animate-in fade-in zoom-in duration-200 overflow-hidden"
                  style={menuStyle}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Context Menu Reactions (Zalo Style) */}
                  <div className="flex items-center justify-between p-2.5 border-b border-slate-100/50 bg-slate-50/50">
                    {['❤️', '👍', '😂', '😮', '😢'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleContextReact(emoji)}
                        className={`hover:scale-125 transition-transform p-1.5 rounded-xl hover:bg-white hover:shadow-sm ${message.my_reaction === emoji ? 'bg-white shadow-sm ring-1 ring-rose-100' : ''}`}
                      >
                        <span className="text-xl leading-none">{emoji}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col py-1.5 font-bold">
                    <button 
                      onClick={() => { onReply?.(message); setShowMenu(false); }}
                      className="px-4 py-3 text-left text-[14px] text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors active:bg-slate-100 border-b border-slate-50/50"
                    >
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      Trả lời
                    </button>
                    <button 
                      onClick={handleCopy}
                      className="px-4 py-3 text-left text-[14px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors active:bg-slate-100"
                    >
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy
                    </button>
                    <button 
                      onClick={handlePinClick}
                      className="px-4 py-3 text-left text-[14px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors active:bg-slate-100"
                    >
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                      Ghim
                    </button>
                    {message.is_mine && (
                      <button 
                        onClick={handleRecallClick}
                        className="px-4 py-3 text-left text-[14px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors active:bg-rose-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Thu hồi
                      </button>
                    )}
                  </div>
                </div>
              </>,
              document.body
            )}

            {/* Actions (Reply/React) - Hover only on desktop */}
            {showActions && !showMenu && (
              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${message.is_mine ? '-left-20' : '-right-20'}`}>
                <button 
                  onClick={() => onReply?.(message)}
                  className="p-2 bg-white rounded-full shadow-md border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                  title="Trả lời"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact?.(message.id, '❤️');
                  }}
                  onMouseEnter={() => setShowReactionPicker(true)}
                  onMouseLeave={() => setShowReactionPicker(false)}
                  className={`p-2 bg-white rounded-full shadow-md border border-slate-100 hover:text-rose-500 hover:bg-rose-50 transition-all font-bold ${showReactionPicker ? 'text-rose-500 ring-2 ring-rose-100' : 'text-slate-400'}`}
                  title="Biểu cảm"
                >
                  {message.my_reaction ? (
                    <span className="text-[14px] leading-none">{message.my_reaction}</span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
