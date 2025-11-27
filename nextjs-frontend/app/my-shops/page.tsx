'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { shops, shopPosts as shopPostsApi, Shop, ShopPost, ApiException, apiRequest } from '@/lib/api';

interface ShopMessageStats {
  unreadCount: number;
  totalMessages: number;
  lastMessage?: string;
  lastMessageSender?: string;
  lastMessageTime?: string;
}

interface PaymentSettings {
  bank_name: string;
  account_number: string;
  account_holder: string;
  upi_id?: string;
  phone?: string;
  qr_code?: string;
}

export default function MyShopsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { socket, onShopMessage, offShopMessage } = useSocket();
  const router = useRouter();
  const [myShops, setMyShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedShopId, setExpandedShopId] = useState<number | null>(null);
  const [postsData, setPostsData] = useState<{ [key: number]: ShopPost[] }>({});
  const [messageStats, setMessageStats] = useState<{ [key: number]: ShopMessageStats }>({});
  const [paymentSettingsModal, setPaymentSettingsModal] = useState<{ shopId: number; shopName: string } | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<{ [key: number]: PaymentSettings }>({});
  const [paymentFormData, setPaymentFormData] = useState<PaymentSettings>({
    bank_name: '',
    account_number: '',
    account_holder: '',
    upi_id: '',
    phone: '',
  });
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchMyShops = async () => {
      if (!isAuthenticated || !user) return;

      try {
        setShopsLoading(true);
        const response = await shops.myShops({ per_page: 50 });
        setMyShops(response.data);

        // Fetch message statistics for each shop
        const shopsData = response.data || [];
        const stats: { [key: number]: ShopMessageStats } = {};

        for (const shop of shopsData) {
          try {
            // Fetch unread count
            const unreadData = await apiRequest<{ unread_count: number }>(
              `/shops/${shop.id}/messages/unread-count`
            );
            const unreadCount = unreadData.unread_count || 0;

            // Fetch messages to get last message and total count
            const messagesData = await apiRequest<{
              data: any[];
              meta: { total: number };
            }>(`/shops/${shop.id}/messages?per_page=1&sort=-created_at`);

            let lastMessage = '';
            let lastMessageSender = '';
            let lastMessageTime = '';
            let totalMessages = 0;

            const messages = messagesData.data || [];
            const meta = messagesData.meta || { total: 0 };

            totalMessages = meta.total || 0;

            if (messages.length > 0) {
              const msg = messages[0];
              lastMessage = msg.message?.substring(0, 50) || '';
              if (lastMessage.length === 50) lastMessage += '...';
              lastMessageTime = msg.created_at || '';
              lastMessageSender = msg.sender?.display_name || msg.sender?.name || 'Customer';
            }

            stats[shop.id] = {
              unreadCount,
              totalMessages,
              lastMessage,
              lastMessageSender,
              lastMessageTime,
            };
          } catch (err) {
            console.error(`Error fetching messages for shop ${shop.id}:`, err);
            stats[shop.id] = {
              unreadCount: 0,
              totalMessages: 0,
            };
          }
        }

        setMessageStats(stats);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError('Failed to load your shops');
        }
        console.error('Error fetching my shops:', err);
      } finally {
        setShopsLoading(false);
      }
    };

    fetchMyShops();
  }, [isAuthenticated, user]);

  // Listen for real-time shop messages
  useEffect(() => {
    if (!socket || !isAuthenticated || !user) return;

    const handleShopMessage = async (message: any) => {
      console.log('[MyShops] Received shop message:', message);

      // Check if this message is for one of the user's shops
      if (message.shopOwnerId === user.id) {
        console.log('[MyShops] Message is for one of my shops:', message.shopId);

        // Update message stats immediately
        setMessageStats((prevStats) => {
          const shopStats = prevStats[message.shopId] || {
            unreadCount: 0,
            totalMessages: 0,
          };

          return {
            ...prevStats,
            [message.shopId]: {
              ...shopStats,
              unreadCount: shopStats.unreadCount + 1,
              totalMessages: shopStats.totalMessages + 1,
              lastMessage: message.message.substring(0, 50),
              lastMessageSender: message.userName || 'Customer',
              lastMessageTime: message.timestamp,
            },
          };
        });

        console.log('[MyShops] Updated message stats for shop:', message.shopId);
      }
    };

    onShopMessage(handleShopMessage);

    return () => {
      offShopMessage(handleShopMessage);
    };
  }, [socket, isAuthenticated, user, onShopMessage, offShopMessage]);

  const handleDelete = async (shopId: number, shopName: string) => {
    if (!confirm(`Are you sure you want to delete "${shopName}"?`)) return;

    try {
      await shops.delete(shopId);
      setMyShops((prev) => prev.filter((shop) => shop.id !== shopId));
      alert('Shop deleted successfully!');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Failed to delete shop: ${err.message}`);
      } else {
        alert('Failed to delete shop');
      }
      console.error('Delete error:', err);
    }
  };

  const toggleShopPosts = async (shopId: number) => {
    if (expandedShopId === shopId) {
      setExpandedShopId(null);
    } else {
      setExpandedShopId(shopId);
      if (!postsData[shopId]) {
        await fetchShopPosts(shopId);
      }
    }
  };

  const fetchShopPosts = async (shopId: number) => {
    try {
      const response = await shopPostsApi.getAll(shopId, { per_page: 50 });
      setPostsData((prev) => ({ ...prev, [shopId]: response.data }));
    } catch (err) {
      console.error('Error fetching shop posts:', err);
      alert('Failed to load posts');
    }
  };

  const handleDeletePost = async (shopId: number, postId: number, postTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${postTitle}"?`)) return;

    try {
      await shopPostsApi.delete(shopId, postId);
      setPostsData((prev) => ({
        ...prev,
        [shopId]: prev[shopId].filter((post: ShopPost) => post.id !== postId),
      }));
      alert('Post deleted successfully!');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Failed to delete post: ${err.message}`);
      } else {
        alert('Failed to delete post');
      }
      console.error('Delete post error:', err);
    }
  };

  const generateQRCode = async () => {
    if (!paymentFormData.bank_name || !paymentFormData.account_number) {
      alert('Please fill in bank name and account number');
      return;
    }

    setLoadingQR(true);
    try {
      // Map Vietnamese bank names to their BIN codes
      const bankCodes: { [key: string]: string } = {
        'vietcombank': '970436',
        'techcombank': '970407',
        'agribank': '970405',
        'tpbank': '970423',
        'mbbank': '970422',
        'acb': '970416',
        'bidv': '970418',
        'vib': '970441',
        'scb': '970429',
        'sacombank': '970403',
        'seabank': '970440',
        'eximbank': '970431',
        'vpbank': '970432',
        'vietinbank': '970415',
      };

      // Match bank name to code
      const bankName = paymentFormData.bank_name.toLowerCase().trim();
      let bankCode = null;

      for (const [key, code] of Object.entries(bankCodes)) {
        if (bankName.includes(key)) {
          bankCode = code;
          break;
        }
      }

      // If no match found, try to use bank_name as-is (in case user provides BIN directly)
      if (!bankCode) {
        bankCode = paymentFormData.bank_name;
      }

      // Build VietQR image URL directly
      // Format: https://img.vietqr.io/image/{BIN}-{ACCOUNT}-qr_only.png?accountName={NAME}
      const qrImageUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(paymentFormData.account_number)}-qr_only.png?accountName=${encodeURIComponent(paymentFormData.account_holder)}`;

      setGeneratedQR(qrImageUrl);
      setPaymentFormData((prev) => ({
        ...prev,
        qr_code: qrImageUrl,
      }));
    } catch (err) {
      console.error('Error generating QR code:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate QR code';
      alert(`${errorMsg}. Please check bank details and try again.`);
    } finally {
      setLoadingQR(false);
    }
  };

  const openPaymentSettings = async (shopId: number, shopName: string) => {
    setPaymentSettingsModal({ shopId, shopName });

    try {
      // Try to load payment settings from backend
      const response = await apiRequest(`/shops/${shopId}/payment-settings`);

      if (response && response.data) {
        const settings = response.data;
        setPaymentFormData({
          bank_name: settings.bank_name || '',
          account_number: settings.account_number || '',
          account_holder: settings.account_holder || '',
          upi_id: settings.upi_id || '',
          phone: settings.phone || '',
        });
        if (settings.qr_code) {
          setGeneratedQR(settings.qr_code);
        }
      } else {
        // No settings found, initialize with defaults
        setPaymentFormData({
          bank_name: '',
          account_number: '',
          account_holder: user?.display_name || user?.username || '',
          upi_id: '',
          phone: '',
        });
        setGeneratedQR(null);
      }
    } catch (err) {
      // Settings don't exist yet, initialize with defaults
      console.log('No payment settings found, initializing with defaults');
      setPaymentFormData({
        bank_name: '',
        account_number: '',
        account_holder: user?.display_name || user?.username || '',
        upi_id: '',
        phone: '',
      });
      setGeneratedQR(null);
    }
  };

  const closePaymentSettings = () => {
    setPaymentSettingsModal(null);
    setGeneratedQR(null);
  };

  const savePaymentSettings = async () => {
    if (!paymentSettingsModal) return;

    if (!paymentFormData.bank_name || !paymentFormData.account_number || !paymentFormData.account_holder) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Save payment settings to backend
      const response = await apiRequest(`/shops/${paymentSettingsModal.shopId}/payment-settings`, {
        method: 'POST',
        body: JSON.stringify({
          bank_name: paymentFormData.bank_name,
          account_number: paymentFormData.account_number,
          account_holder: paymentFormData.account_holder,
          upi_id: paymentFormData.upi_id || null,
          phone: paymentFormData.phone || null,
          qr_code: paymentFormData.qr_code || null,
        }),
      });

      if (response) {
        // Update local state as well for consistency
        setPaymentSettings((prev) => ({
          ...prev,
          [paymentSettingsModal.shopId]: paymentFormData,
        }));

        alert('Payment settings saved successfully!');
        closePaymentSettings();
      }
    } catch (err) {
      console.error('Error saving payment settings:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to save payment settings';
      alert(`${errorMsg}`);
    }
  };

  if (isLoading || shopsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Shops</h1>
            <p className="text-gray-600 mt-2">Manage your shops and track their status</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/shops"
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              All Shops
            </Link>
            <Link
              href="/shops/create"
              className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Shop
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-grey-200 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Pending Shop Notification */}
        {myShops.some((shop) => shop.status === 'pending') && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Shop(s) Pending Approval</h3>
                <p className="text-yellow-800 text-sm">
                  Some of your shops are waiting for admin approval. They will appear in the public listing once approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shops List */}
        {myShops.length === 0 ? (
          <div className="bg-grey-200 rounded-lg shadow p-12 text-center">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Shops Yet</h3>
            <p className="text-gray-600 mb-6">You haven't created any shops. Start by creating your first shop!</p>
            <Link
              href="/shops/create"
              className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Shop
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-grey-200 rounded-lg shadow-md border border-gray-300 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Shop Header */}
                <div className={`px-6 py-4 ${
                  shop.status === 'active'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                    : shop.status === 'pending'
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-700'
                    : 'bg-gradient-to-r from-gray-600 to-gray-700'
                }`}>
                  <h3 className="text-xl font-bold text-gray-900">{shop.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      shop.status === 'active'
                        ? 'bg-blue-500 text-green-800'
                        : shop.status === 'inactive'
                        ? 'bg-blue-500 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {shop.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Shop Details */}
                <div className="p-6">
                  {shop.description && (
                    <div className="mb-4">
                      <p className="text-gray-700 line-clamp-3">{shop.description}</p>
                    </div>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    {(shop.city || shop.state || shop.country) && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-600">
                          {[shop.city, shop.state, shop.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    {shop.phone && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-gray-600">{shop.phone}</span>
                      </div>
                    )}

                    {shop.email && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-600">{shop.email}</span>
                      </div>
                    )}

                    {shop.website && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <a href={shop.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                          {shop.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Messages Section */}
                  {messageStats[shop.id] && (messageStats[shop.id].unreadCount > 0 || messageStats[shop.id].totalMessages > 0) && (
                    <div className="mt-4 p-4 bg-grey-200 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Customer Messages
                        </h4>
                        {messageStats[shop.id].unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-gray-900 bg-grey-2000 rounded-full">
                            {messageStats[shop.id].unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="text-blue-800">
                          <span className="font-semibold">{messageStats[shop.id].totalMessages}</span> total message{messageStats[shop.id].totalMessages !== 1 ? 's' : ''}
                        </p>

                        {messageStats[shop.id].lastMessage && (
                          <div className="bg-grey-200 rounded p-3 border border-blue-200">
                            <p className="text-xs text-gray-500 mb-1">Latest from {messageStats[shop.id].lastMessageSender}</p>
                            <p className="text-gray-700 text-sm italic">"{messageStats[shop.id].lastMessage}"</p>
                            {messageStats[shop.id].lastMessageTime && (
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(messageStats[shop.id].lastMessageTime!).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}

                        <Link
                          href={`/shop-messages/${shop.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm mt-2"
                        >
                          View all messages
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-4 border-t border-gray-300">
                    {/* Primary Action - View Shop */}
                    <Link
                      href={`/shops/${shop.id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-gray-900 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Shop
                    </Link>

                    {/* Create Content Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/shops/${shop.id}/posts/create`}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Post
                      </Link>
                      <Link
                        href={`/shops/${shop.id}/posts/create`}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        New Page
                      </Link>
                    </div>

                    {/* Messages Button */}
                    <Link
                      href={`/shop-messages/${shop.id}`}
                      className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {messageStats[shop.id]?.unreadCount > 0 ? `Messages (${messageStats[shop.id].unreadCount})` : 'Messages'}
                    </Link>

                    {/* Orders Button */}
                    <Link
                      href={`/shops/${shop.id}/orders`}
                      className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Manage Orders
                    </Link>

                    {/* Management Actions */}
                    <div className="grid grid-cols-2 md:flex md:gap-2 gap-2">
                      <button
                        onClick={() => toggleShopPosts(shop.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm md:flex-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="hidden sm:inline">{expandedShopId === shop.id ? 'Hide Posts' : 'Manage Posts'}</span>
                        <span className="sm:hidden">{expandedShopId === shop.id ? 'Hide' : 'Posts'}</span>
                      </button>
                      <button
                        onClick={() => openPaymentSettings(shop.id, shop.name)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm md:flex-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="hidden sm:inline">Payment</span>
                      </button>
                      <Link
                        href={`/shops/${shop.id}/edit`}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm md:flex-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(shop.id, shop.name)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-700 text-gray-900 rounded-lg font-medium transition-colors text-sm md:flex-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Posts Section */}
                {expandedShopId === shop.id && (
                    <div className="px-6 pb-6 border-t border-gray-300">
                      <div className="mt-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Posts & Pages</h4>
                        {!postsData[shop.id] ? (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          </div>
                        ) : postsData[shop.id].length === 0 ? (
                          <div className="text-center py-8 bg-white rounded-lg">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 mb-3">No posts yet</p>
                            <Link
                              href={`/shops/${shop.id}/posts/create`}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Create First Post
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {postsData[shop.id].map((post: ShopPost) => (
                              <div key={post.id} className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-500 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium text-gray-900 truncate">{post.title}</h5>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                      post.type === 'post' ? 'bg-blue-500 text-blue-800' : 'bg-blue-500 text-purple-800'
                                    }`}>
                                      {post.type}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                      post.status === 'published' ? 'bg-blue-500 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {post.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {post.view_count} views • {new Date(post.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <Link
                                    href={`/shops/${shop.id}/posts/${post.id}/edit`}
                                    className="p-2 text-blue-600 hover:bg-grey-200 rounded-md transition-colors"
                                    title="Edit"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </Link>
                                  <button
                                    onClick={() => handleDeletePost(shop.id, post.id, post.title)}
                                    className="p-2 text-red-600 hover:bg-grey-200 rounded-md transition-colors"
                                    title="Delete"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {/* Payment Settings Modal */}
        {paymentSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-grey-200 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Payment Settings</h2>
                <p className="text-amber-100 text-sm">Shop: {paymentSettingsModal.shopName}</p>
                <button
                  onClick={closePaymentSettings}
                  className="text-gray-900 hover:bg-blue-700 p-2 rounded transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Bank Details Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Bank Account Details</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Vietcombank, Techcombank"
                      value={paymentFormData.bank_name}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your bank account number"
                      value={paymentFormData.account_number}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, account_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Holder Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Name on the bank account"
                      value={paymentFormData.account_holder}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, account_holder: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="UPI ID for mobile payments"
                      value={paymentFormData.upi_id || ''}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, upi_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contact phone number"
                      value={paymentFormData.phone || ''}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* QR Code Generation */}
                <div className="space-y-4 border-t border-gray-300 pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">VietQR Code</h3>
                    <button
                      onClick={generateQRCode}
                      disabled={loadingQR || !paymentFormData.bank_name || !paymentFormData.account_number}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-700 disabled:bg-blue-400 text-gray-900 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {loadingQR ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="1" fill="currentColor"></circle>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Generate QR Code
                        </>
                      )}
                    </button>
                  </div>

                  {generatedQR && (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="border-4 border-amber-200 rounded-lg p-4 bg-grey-200">
                        <img
                          src={generatedQR}
                          alt="VietQR Code"
                          className="w-64 h-64 object-contain"
                        />
                      </div>
                      <p className="text-sm text-gray-600 text-center">
                        QR code generated successfully. Display this code to receive payments via VietQR.
                      </p>
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-grey-200 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> VietQR allows customers to scan and transfer money directly to your bank account.
                  </p>
                  <p className="text-xs text-blue-800">
                    Supported banks: vietcombank, techcombank, agribank, tpbank, mbbank, acb, bidv, vib, scb, sacombank, seabank, eximbank, vpbank, vietinbank and more.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-300 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={closePaymentSettings}
                  className="px-6 py-2 border border-gray-300 hover:bg-blue-500 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePaymentSettings}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
