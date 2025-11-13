'use client';

import { useState, useRef, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface ShopMessageModalProps {
  shopId: number;
  shopName: string;
  shopOwnerId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopMessageModal({
  shopId,
  shopName,
  shopOwnerId,
  isOpen,
  onClose,
}: ShopMessageModalProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }

    if (!user) {
      setError('You must be logged in to send a message');
      return;
    }

    if (!socket) {
      setError('Connection error. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // When customer sends message from shop page:
      // - userId = customer's ID (the one sending the message)
      // - shopOwnerId = shop owner's ID (who will receive it)
      // Room name is broadcast initially: "*-shop{shopId}"
      // Server will normalize to: "{customerId}-shop{shopId}"
      const roomName = `*-shop${shopId}`;

      console.log(`[ShopMessageModal] Sending initial message to shop`, {
        shopId,
        shopName,
        customerId: user.id,
        shopOwnerId,
        roomName,
        message: message.trim(),
      });

      // Emit shop message to socket
      socket.emit('shop:message', {
        shopId,
        shopName,
        shopOwnerId,
        userId: user.id, // Customer's ID
        userName: user.display_name || user.name,
        message: message.trim(),
        roomName,
        timestamp: new Date().toISOString(),
      });

      console.log(`[ShopMessageModal] ✅ Message emitted to socket`);

      setSuccess(true);
      setMessage('');

      // Auto-close success message after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('[ShopMessageModal] Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Message Shop</h2>
            <p className="text-sm text-gray-600">{shopName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSendMessage} className="p-6 space-y-4">
          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Message sent successfully!</p>
                <p className="text-xs text-green-700">The shop will receive your message shortly.</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Message Input */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Your Message
            </label>
            <textarea
              ref={textareaRef}
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here... (e.g., inquiries, product questions, feedback)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={5}
              disabled={loading || success}
            />
            <p className="mt-2 text-xs text-gray-500">
              {message.length} / 1000 characters
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success || !message.trim()}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Message
              </>
            )}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </form>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-blue-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-blue-700">
            💡 Your message will be delivered to the shop via Socket.IO real-time messaging.
          </p>
        </div>
      </div>
    </div>
  );
}
