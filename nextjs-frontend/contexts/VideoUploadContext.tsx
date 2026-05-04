'use client';

import React, { createContext, useContext, useState, ReactNode, useRef, useCallback } from 'react';
import { posts } from '@/lib/api';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface VideoUploadContextType {
  uploadVideo: (postId: number, videoFile: File) => void;
}

const VideoUploadContext = createContext<VideoUploadContextType | undefined>(undefined);

export function VideoUploadProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const intervalsRef = useRef<Record<number, NodeJS.Timeout>>({});

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove toast after 5 seconds if not info (processing)
    // Actually let's assume info goes away when replaced by success/error
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const uploadVideo = async (postId: number, videoFile: File) => {
    try {
      showToast('Đang tải video lên...', 'info');
      await posts.uploadVideo(postId, videoFile);
      
      showToast('Video đang được xử lý trong nền...', 'info');
      
      const intervalId = setInterval(async () => {
        try {
          const status = await posts.getVideoStatus(postId);
          if (status.video_upload_status === 'completed') {
            clearInterval(intervalsRef.current[postId]);
            delete intervalsRef.current[postId];
            showToast('Video bài viết tải lên thành công!', 'success');
          } else if (status.video_upload_status === 'failed') {
            clearInterval(intervalsRef.current[postId]);
            delete intervalsRef.current[postId];
            showToast('Lỗi tải video bài viết lên: ' + (status.video_upload_error || 'Không xác định'), 'error');
          }
        } catch (error) {
          console.error("Lỗi kiểm tra trạng thái video:", error);
        }
      }, 3000);
      
      intervalsRef.current[postId] = intervalId;
    } catch (e) {
      console.error(e);
      showToast('Lỗi gửi video lên hệ thống', 'error');
    }
  };

  return (
    <VideoUploadContext.Provider value={{ uploadVideo }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-24 left-4 z-[9999] flex flex-col gap-2">
          {toasts.map((toast) => (
            <div 
              key={toast.id} 
              className={`px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 transition-all ${
                toast.type === 'success' ? 'bg-green-600' :
                toast.type === 'error' ? 'bg-red-600' :
                'bg-blue-600'
              }`}
            >
              {toast.type === 'success' && <span className="text-xl">✅</span>}
              {toast.type === 'error' && <span className="text-xl">❌</span>}
              {toast.type === 'info' && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span className="font-medium text-sm">{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </VideoUploadContext.Provider>
  );
}

export const useVideoUpload = () => {
  const context = useContext(VideoUploadContext);
  if (!context) throw new Error('useVideoUpload must be used within VideoUploadProvider');
  return context;
};
