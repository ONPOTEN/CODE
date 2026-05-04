'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFileViaProxy } from '@/lib/s3-upload';

interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  message: string;
  timestamp: string;
  isOwn: boolean;
}

interface ShopChatRoomProps {
  shopId: number;
  shopName: string;
  shopOwnerId: number;
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopChatRoom({
  shopId,
  shopName,
  shopOwnerId,
  isOwner,
  isOpen,
  onClose,
}: ShopChatRoomProps) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [roomJoined, setRoomJoined] = useState(false);

  // Room name format: "{userid}-shop{shopid}" (where userid is the customer's ID)
  const roomName = user ? `${user.id}-shop${shopId}` : '';

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join room and listen for messages
  useEffect(() => {
    if (!socket || !isOpen || !user || !roomName) {
      return;
    }

    console.log('[ShopChatRoom] Joining room:', roomName);

    // Join the chat room
    socket.emit('join:shop:chat', {
      userId: user.id,
      shopId: shopId,
      shopOwnerId: shopOwnerId,
      roomName: roomName,
      userName: user.display_name || user.username,
    });

    const handleChatMessage = (data: any) => {
      console.log('[ShopChatRoom] Received chat message:', data);

      if (data.shopId === shopId) {
        const newMessage: ChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          senderId: data.senderId,
          senderName: data.senderName,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          isOwn: data.senderId === user.id,
        };

        console.log('[ShopChatRoom] Adding message to state:', newMessage);
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    socket.on('shop:chat:message', handleChatMessage);
    setRoomJoined(true);

    return () => {
      console.log('[ShopChatRoom] Leaving room:', roomName);
      socket.off('shop:chat:message', handleChatMessage);
      socket.emit('leave:shop:chat', {
        userId: user.id,
        shopId: shopId,
        roomName: roomName,
      });
      setRoomJoined(false);
    };
  }, [socket, isOpen, user, shopId, shopOwnerId, roomName]);

  // Image attachment handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        newFiles.push(file);
        newPreviewUrls.push(URL.createObjectURL(file));
      }
    });

    setSelectedImages((prev) => [...prev, ...newFiles]);
    setImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      try {
        setUploadProgress(((i + 0.5) / selectedImages.length) * 100);

        const fileUrl = await uploadFileViaProxy(file, (progress) => {
          const overallProgress = ((i + progress / 100) / selectedImages.length) * 100;
          setUploadProgress(overallProgress);
        });

        uploadedUrls.push(fileUrl);
        setUploadProgress(((i + 1) / selectedImages.length) * 100);
      } catch (error) {
        console.error(`Failed to upload image ${file.name}:`, error);
        throw error;
      }
    }

    return uploadedUrls;
  };

  // Helper function to check if message contains images
  const isImageMessage = (message: string): boolean => {
    return message.includes('[IMAGE]') && message.includes('[/IMAGE]');
  };

  // Helper function to parse message and extract images
  const parseMessageContent = (message: string): { text: string; images: string[] } => {
    const images: string[] = [];
    const imageRegex = /\[IMAGE\](.*?)\[\/IMAGE\]/g;
    let match;

    while ((match = imageRegex.exec(message)) !== null) {
      images.push(match[1]);
    }

    const text = message.replace(imageRegex, '').trim();

    return { text, images };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!inputMessage.trim() && selectedImages.length === 0) || !socket || !user || isUploading) {
      return;
    }

    setLoading(true);

    try {
      let imageUrls: string[] = [];

      // Upload images first if any
      if (selectedImages.length > 0) {
        setIsUploading(true);
        try {
          imageUrls = await uploadImages();
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }

      // Build message content with image URLs
      let finalMessage = inputMessage.trim();
      if (imageUrls.length > 0) {
        const imageMarkup = imageUrls.map((url) => `[IMAGE]${url}[/IMAGE]`).join('\n');
        finalMessage = finalMessage ? `${finalMessage}\n${imageMarkup}` : imageMarkup;
      }

      if (!finalMessage) return;

      // Emit the chat message
      socket.emit('shop:chat:message', {
        shopId,
        shopName,
        shopOwnerId,
        senderId: user.id,
        senderName: user.display_name || user.username,
        message: finalMessage,
        roomName,
        timestamp: new Date().toISOString(),
      });

      console.log('[ShopChatRoom] Message sent:', finalMessage, {
        roomName,
        senderId: user.id,
        senderName: user.display_name || user.username,
      });

      // Add the message to local state immediately
      const sentMessage: ChatMessage = {
        id: `${Date.now()}-own`,
        senderId: user.id,
        senderName: user.display_name || user.username,
        message: finalMessage,
        timestamp: new Date().toISOString(),
        isOwn: true,
      };

      setMessages((prev) => [...prev, sentMessage]);
      setInputMessage('');

      // Clear selected images
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedImages([]);
      setImagePreviewUrls([]);
    } catch (error) {
      console.error('[ShopChatRoom] Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-lg shadow-xl max-w-2xl w-full h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Trò chuyện với {isOwner ? 'Khách hàng' : shopName}</h2>
            <p className="text-xs text-gray-600">Phòng: {roomName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-start gap-2">
            <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-yellow-800">Chưa kết nối Socket.IO - tin nhắn có thể không được gửi</p>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500 font-medium">Chưa có tin nhắn</p>
                <p className="text-xs text-gray-600">Bắt đầu cuộc trò chuyện</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.isOwn
                        ? 'bg-blue-600 text-gray-900 rounded-br-none'
                        : 'bg-gray-50 text-gray-900 border border-gray-300 rounded-bl-none'
                    }`}
                  >
                    {!msg.isOwn && (
                      <p className="text-xs font-medium text-gray-600 mb-1">{msg.senderName}</p>
                    )}
                    {isImageMessage(msg.message) ? (
                      (() => {
                        const { text, images } = parseMessageContent(msg.message);
                        return (
                          <>
                            {text && <p className="text-sm leading-relaxed break-words mb-2">{text}</p>}
                            <div className="space-y-2">
                              {images.map((imageUrl, idx) => (
                                <a
                                  key={idx}
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`Hình ảnh ${idx + 1}`}
                                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{ maxHeight: '200px', objectFit: 'contain' }}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </a>
                              ))}
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                    )}
                    <p className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-300 bg-gray-50">
          {/* Image Preview */}
          {imagePreviewUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 p-2 bg-white rounded-lg border border-gray-200">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-14 h-14 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeSelectedImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang tải ảnh... {Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Image attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isUploading || !isConnected}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Đính kèm hình ảnh"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Nhập tin nhắn..."
              disabled={loading || isUploading || !isConnected}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading || isUploading || (!inputMessage.trim() && selectedImages.length === 0) || !isConnected}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading || isUploading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
              Gửi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
