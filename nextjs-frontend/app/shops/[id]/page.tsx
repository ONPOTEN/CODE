'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { shops, shopPosts, type Shop, type ShopPost, ApiException, apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import ShopMessageModal from '@/components/ShopMessageModal';
import ShopMessagesSection from '@/components/ShopMessagesSection';
import ShopMessageInbox from '@/components/ShopMessageInbox';
import { SimpleProductsList } from '@/app/shops/[id]/posts/SimpleProductsList';
import { VariantProductsList } from '@/app/shops/[id]/posts/VariantProductsList';
import { DownloadProductsList } from '@/app/shops/[id]/posts/DownloadProductsList';

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const shopId = Number(params.id);

  const [shop, setShop] = useState<Shop | null>(null);
  const [allPosts, setAllPosts] = useState<ShopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'post' | 'page'>('all');
  const [productTypeView, setProductTypeView] = useState<'all' | 'simple' | 'variant' | 'download'>('all');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isPaymentSettingsOpen, setIsPaymentSettingsOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    upi_id: '',
    phone: '',
    qr_code: '',
  });
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const isOwner = user && shop && shop.user_id === user.id;

  // Handle swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchStart - touchEnd > 50) {
      // Swiped left, go to next
      setCarouselIndex((prev) => (prev + 1) % 5);
    } else if (touchEnd - touchStart > 50) {
      // Swiped right, go to previous
      setCarouselIndex((prev) => (prev - 1 + 5) % 5);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [shopId, filterType]);

  const fetchShopData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await shops.getById(shopId);
      console.log('[Shop Detail] Raw response:', response);

      // Handle both direct ShopResource and wrapped response
      const shopData = response && typeof response === 'object' && 'name' in response
        ? response
        : (response as any)?.data || response;

      console.log('[Shop Detail] Processed shop data:', {
        id: shopData?.id,
        name: shopData?.name,
        logo: shopData?.logo,
        banner: shopData?.banner,
        hasLogo: !!shopData?.logo,
        hasBanner: !!shopData?.banner,
        allKeys: shopData ? Object.keys(shopData) : [],
      });
      setShop(shopData);

      // Fetch all posts - show all if owner, published only for visitors
      try {
        const isShopOwner = user && shopData && shopData.user_id === user.id;
        const postsData = await shopPosts.getAll(shopId, {
          per_page: 100,
          type: filterType !== 'all' ? filterType : undefined,
          status: isShopOwner ? undefined : 'published',
        });
        console.log('[Shop Detail] Posts fetched:', postsData.data);
        setAllPosts(postsData.data || []);
      } catch (err) {
        console.error('Error fetching posts:', err);
        // Don't fail the whole page if posts fail to load
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to load shop');
      }
      console.error('Error fetching shop:', err);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentSettings = async () => {
    setIsPaymentSettingsOpen(true);
    try {
      // Load existing payment settings from backend
      const response = await apiRequest(`/shops/${shopId}/payment-settings`);
      if (response?.data) {
        setPaymentFormData({
          bank_name: response.data.bank_name || '',
          account_number: response.data.account_number || '',
          account_holder: response.data.account_holder || '',
          upi_id: response.data.upi_id || '',
          phone: response.data.phone || '',
          qr_code: response.data.qr_code || '',
        });
        if (response.data.qr_code) {
          setGeneratedQR(response.data.qr_code);
        }
      }
    } catch (err) {
      // Settings don't exist yet, keep form empty
      setPaymentFormData({
        bank_name: '',
        account_number: '',
        account_holder: user?.display_name || user?.username || '',
        upi_id: '',
        phone: '',
        qr_code: '',
      });
      setGeneratedQR(null);
    }
  };

  const generateQRCode = async () => {
    if (!paymentFormData.bank_name || !paymentFormData.account_number) {
      alert('Please fill in bank name and account number');
      return;
    }

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

      // If no match found, use as-is
      if (!bankCode) {
        bankCode = paymentFormData.bank_name;
      }

      // Build VietQR image URL
      const qrImageUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(paymentFormData.account_number)}-qr_only.png?accountName=${encodeURIComponent(paymentFormData.account_holder)}`;

      setGeneratedQR(qrImageUrl);
      setPaymentFormData((prev) => ({
        ...prev,
        qr_code: qrImageUrl,
      }));
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert('Failed to generate QR code. Please check bank details and try again.');
    }
  };

  const savePaymentSettings = async () => {
    if (!paymentFormData.bank_name || !paymentFormData.account_number || !paymentFormData.account_holder) {
      alert('Please fill in all required fields');
      return;
    }

    setSavingPaymentSettings(true);
    try {
      await apiRequest(`/shops/${shopId}/payment-settings`, {
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

      alert('Payment settings saved successfully!');
      setIsPaymentSettingsOpen(false);
    } catch (err) {
      console.error('Error saving payment settings:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to save payment settings';
      alert(`${errorMsg}`);
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Shop Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The shop you are looking for does not exist.'}</p>
          <Link
            href="/shops"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Shops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Section */}
      {shop.banner ? (
        <div className="relative h-64 bg-gray-300 overflow-hidden">
          <img src={shop.banner} alt="Shop banner" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-64 bg-gradient-to-r from-blue-600 to-blue-800"></div>
      )}

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Top Row: Logo and Shop Info */}
          <div className="flex items-start justify-between gap-6 mb-8">
            {/* Left Column: Logo */}
            <div className="flex-shrink-0">
              {/* Logo */}
              {shop.logo && (
                <div>
                  <img
                    src={shop.logo}
                    alt={shop.name}
                    className="w-32 h-32 rounded-lg object-cover border-4 border-white shadow-lg"
                  />
                </div>
              )}
            </div>

            {/* Right Column: Shop Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold text-gray-900">{shop.name}</h1>
                {shop.status && (
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                      shop.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : shop.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {shop.status.toUpperCase()}
                  </span>
                )}
              </div>
              {shop.description && (
                <p className="text-gray-600 text-lg max-w-3xl mb-4">{shop.description}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {/* Edit Button - Only for Owner */}
              {isOwner && (
                <Link
                  href={`/shops/${shop.id}/edit`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors h-fit whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Shop
                </Link>
              )}

              {/* Message Button - Only for Logged-in Users (Not Owner) */}
              {user && !isOwner && (
                <button
                  onClick={() => setIsMessageModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors h-fit whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Message Shop
                </button>
              )}
            </div>
          </div>

          {/* Shop Action Buttons - Share, Call, Find Path, Message */}
          <div className="pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Share Button */}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: shop.name,
                      text: `Check out ${shop.name} on our platform!`,
                      url: window.location.href,
                    }).catch(err => console.log('Error sharing:', err));
                  } else {
                    // Fallback for browsers that don't support share API
                    const text = `Check out ${shop.name}: ${window.location.href}`;
                    navigator.clipboard.writeText(text);
                    alert('Link copied to clipboard!');
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.589 12.430 10 11.129 10 9.5 10 5.91 7.748 3 5 3S0 5.91 0 9.5 2.252 16 5 16c1.209 0 2.347-.356 3.297-.988m0 0h6.687c3.13 0 4.674-1.50 5.207-2.589.534-1.089.534-2.847.534-4.659V9.325c0-1.812 0-3.57-.534-4.659-.533-1.089-2.077-2.589-5.207-2.589h-6.687a4.976 4.976 0 000 9.974v2.5m0 0H15" />
                </svg>
                <span className="text-xs">Share</span>
              </button>

              {/* Call Button */}
              <a
                href={shop.phone ? `tel:${shop.phone}` : 'javascript:void(0);'}
                onClick={(e) => {
                  if (!shop.phone) {
                    e.preventDefault();
                    alert('Phone number not available');
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg font-medium transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-xs">Call</span>
              </a>

              {/* Find Path Button */}
              <a
                href={shop.address ? `https://www.google.com/maps/search/${encodeURIComponent(shop.address)}` : 'javascript:void(0);'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!shop.address) {
                    e.preventDefault();
                    alert('Address not available');
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg font-medium transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6.553 3.276A1 1 0 0021 20.382V9.618a1 1 0 00-1.447-.894L15 11m0 0V5m0 6.618l6.553-3.276" />
                </svg>
                <span className="text-xs">Find Path</span>
              </a>

              {/* Message Button */}
              <button
                onClick={() => setIsMessageModalOpen(true)}
                className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg font-medium transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">Message</span>
              </button>
            </div>
          </div>
          
          {/* Thông Tin Cửa Hàng Images - Carousel Slider */}
          {(shop.image_1 || shop.image_2 || shop.image_3 || shop.image_4 || shop.image_5) && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-900 mb-2">Thông Tin Cửa Hàng</p>

              {/* Carousel Container */}
              <div
                className="relative select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Images Container - Shows 2 images with smooth transition */}
                <div className="grid grid-cols-2 gap-2 transition-all duration-300 ease-in-out">
                  {/* Image Set 0: image_1, image_2 */}
                  {carouselIndex % 5 === 0 && (
                    <>
                      {shop.image_1 && (
                        <div title="Giấy DKKD" className="group animate-fadeIn">
                          <img
                            src={shop.image_1}
                            alt="Giấy DKKD"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_1, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Giấy DKKD</p>
                        </div>
                      )}
                      {shop.image_2 && (
                        <div title="Giấy phép kinh doanh" className="group animate-fadeIn animation-delay-100">
                          <img
                            src={shop.image_2}
                            alt="Giấy phép kinh doanh"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_2, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Giấy phép kinh doanh</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Image Set 1: image_2, image_3 */}
                  {carouselIndex % 5 === 1 && (
                    <>
                      {shop.image_2 && (
                        <div title="Giấy phép kinh doanh" className="group">
                          <img
                            src={shop.image_2}
                            alt="Giấy phép kinh doanh"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_2, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Giấy phép kinh doanh</p>
                        </div>
                      )}
                      {shop.image_3 && (
                        <div title="Chứng chỉ liên quan" className="group">
                          <img
                            src={shop.image_3}
                            alt="Chứng chỉ liên quan"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_3, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Chứng chỉ liên quan</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Image Set 2: image_3, image_4 */}
                  {carouselIndex % 5 === 2 && (
                    <>
                      {shop.image_3 && (
                        <div title="Chứng chỉ liên quan" className="group">
                          <img
                            src={shop.image_3}
                            alt="Chứng chỉ liên quan"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_3, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Chứng chỉ liên quan</p>
                        </div>
                      )}
                      {shop.image_4 && (
                        <div title="Hình ảnh cửa hàng" className="group">
                          <img
                            src={shop.image_4}
                            alt="Hình ảnh cửa hàng"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_4, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Hình ảnh cửa hàng</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Image Set 3: image_4, image_5 */}
                  {carouselIndex % 5 === 3 && (
                    <>
                      {shop.image_4 && (
                        <div title="Hình ảnh cửa hàng" className="group">
                          <img
                            src={shop.image_4}
                            alt="Hình ảnh cửa hàng"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_4, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Hình ảnh cửa hàng</p>
                        </div>
                      )}
                      {shop.image_5 && (
                        <div title="Ảnh bổ sung" className="group">
                          <img
                            src={shop.image_5}
                            alt="Ảnh bổ sung"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_5, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Ảnh bổ sung</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Image Set 4: image_5, image_1 (wrap around) */}
                  {carouselIndex % 5 === 4 && (
                    <>
                      {shop.image_5 && (
                        <div title="Ảnh bổ sung" className="group">
                          <img
                            src={shop.image_5}
                            alt="Ảnh bổ sung"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_5, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Ảnh bổ sung</p>
                        </div>
                      )}
                      {shop.image_1 && (
                        <div title="Giấy DKKD" className="group">
                          <img
                            src={shop.image_1}
                            alt="Giấy DKKD"
                            className="w-full aspect-video rounded-lg object-cover border border-gray-300 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => window.open(shop.image_1, '_blank')}
                          />
                          <p className="text-xs text-gray-600 text-center mt-1">Giấy DKKD</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Navigation Buttons */}
                <button
                  onClick={() => setCarouselIndex((prev) => (prev + 1) % 5)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-10 md:translate-x-0 md:right-0 bg-white hover:bg-gray-100 border border-gray-300 rounded-full p-1.5 shadow-md transition-all"
                  aria-label="Next images"
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setCarouselIndex((prev) => (prev - 1 + 5) % 5)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 md:-translate-x-0 md:left-0 bg-white hover:bg-gray-100 border border-gray-300 rounded-full p-1.5 shadow-md transition-all"
                  aria-label="Previous images"
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              {/* Indicators */}
              <div className="flex justify-center gap-1.5 mt-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      carouselIndex % 5 === i ? 'bg-gray-900 w-4' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to image set ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Quick Actions for Owner */}
            {isOwner && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/shops/${shop.id}/posts/create`}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Post
                  </Link>
                  <Link
                    href={`/shops/${shop.id}/posts/create`}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Create Page
                  </Link>
                  <Link
                    href={`/shops/${shop.id}/posts`}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Manage Posts
                  </Link>
                  <Link
                    href="/my-shops"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    My Shops
                  </Link>
                  <button
                    onClick={openPaymentSettings}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Payment Settings
                  </button>
                  <Link
                    href={`/shops/${shop.id}/orders`}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Manage Orders
                  </Link>
                </div>
              </div>
            )}

            {/* Shop Messages Section - Only for Owner */}
            {isOwner && shop && (
              <ShopMessagesSection shopId={shop.id} isOwner={isOwner} />
            )}

            {/* Customer Message Inbox - Only for Non-Owner Logged-in Users */}
            {!isOwner && user && shop && (
              <ShopMessageInbox
                shopId={shop.id}
                shopName={shop.name}
                shopOwnerId={shop.user_id}
                isOwner={false}
              />
            )}

            {/* Posts & Pages Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {filterType === 'post' ? 'Posts' : filterType === 'page' ? 'Pages' : 'Posts & Pages'}
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'all' | 'post' | 'page')}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="post">Posts Only</option>
                    <option value="page">Pages Only</option>
                  </select>
                  {isOwner && (
                    <Link
                      href={`/shops/${shop.id}/posts`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm whitespace-nowrap"
                    >
                      Manage →
                    </Link>
                  )}
                </div>
              </div>

              {/* Product Type Filter Tabs */}
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setProductTypeView('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      productTypeView === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Products
                  </button>
                  <button
                    onClick={() => setProductTypeView('simple')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      productTypeView === 'simple'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    🛍️ Simple
                  </button>
                  <button
                    onClick={() => setProductTypeView('variant')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      productTypeView === 'variant'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    🎨 Variant
                  </button>
                  <button
                    onClick={() => setProductTypeView('download')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      productTypeView === 'download'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    📥 Download
                  </button>
                </div>

                {/* Go to Cart Button */}
                <Link
                  href="/cart"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors whitespace-nowrap shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Go to Cart
                </Link>
              </div>

              {/* Product Type Views */}
              {productTypeView === 'simple' && <SimpleProductsList shopId={shopId} />}
              {productTypeView === 'variant' && <VariantProductsList shopId={shopId} />}
              {productTypeView === 'download' && <DownloadProductsList shopId={shopId} />}

              {/* Show all products mixed view */}
              {productTypeView === 'all' && (
                allPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg mb-2">No products yet</p>
                    {isOwner && (
                      <Link
                        href={`/shops/${shop.id}/posts/create`}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first product
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {allPosts.map((post) => (
                      <article key={post.id} className="border-b border-gray-200 pb-8 last:border-0 last:pb-0">
                        {/* Post Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h2 className="text-2xl font-bold text-gray-900">{post.title}</h2>
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                post.type === 'post' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {post.type.toUpperCase()}
                              </span>
                              {post.product_type && (
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                  post.product_type === 'Đơn giản'
                                    ? 'bg-blue-100 text-blue-800'
                                    : post.product_type === 'Biến thể'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {post.product_type}
                                </span>
                              )}
                              {post.status && (
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                  post.status === 'published'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {post.status.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {post.view_count} views
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(post.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              {post.author && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {post.author.name || post.author.username}
                                </span>
                              )}
                            </div>
                          </div>
                          {isOwner && (
                            <div className="flex gap-2 ml-4">
                              <Link
                                href={`/shops/${shopId}/posts/${post.id}/edit`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Main Image */}
                        {(post as any).main_image && (
                          <div className="mb-6">
                            <img
                              src={(post as any).main_image}
                              alt={`${post.title} - Main Image`}
                              className="w-full h-auto max-h-96 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                              onClick={() => {
                                window.open((post as any).main_image, '_blank');
                              }}
                            />
                          </div>
                        )}

                        {/* Other Images Gallery */}
                        {(post as any).other_images && (post as any).other_images.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Images</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {(post as any).other_images.map((imagePath: string, imgIndex: number) => (
                                <img
                                  key={imgIndex}
                                  src={imagePath}
                                  alt={`${post.title} - Additional Image ${imgIndex + 1}`}
                                  className="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                  onClick={() => {
                                    window.open(imagePath, '_blank');
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Featured Images Gallery */}
                        {post.featured_images && post.featured_images.length > 0 && (
                          <div className="mb-6">
                            {post.featured_images.length === 1 ? (
                              // Single image - full width
                              <img
                                src={post.featured_images[0]}
                                alt={post.title}
                                className="w-full h-auto max-h-96 object-cover rounded-lg shadow-md"
                              />
                            ) : (
                              // Multiple images - grid layout
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {post.featured_images.map((imagePath, imgIndex) => (
                                  <img
                                    key={imgIndex}
                                    src={imagePath}
                                    alt={`${post.title} - Image ${imgIndex + 1}`}
                                    className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => {
                                      // Open in new tab for full view
                                      window.open(imagePath, '_blank');
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Price Range */}
                        {post.price_range && (
                          <div className="mb-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-green-800 font-semibold">
                                {post.price_range}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Post Content */}
                        {post.content && (
                          <div className="prose prose-lg max-w-none mb-6">
                            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {post.content}
                            </div>
                          </div>
                        )}

                        {/* View Details Button */}
                        <div className="flex items-center gap-3 pt-4">
                          <Link
                            href={`/shops/${shopId}/posts/${post.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Full Details
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-3">
                {shop.address && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-gray-900 font-medium">Address</p>
                      <p className="text-gray-600 text-sm">
                        {shop.address}
                        {shop.city && <><br />{shop.city}</>}
                        {shop.state && `, ${shop.state}`}
                        {shop.postal_code && ` ${shop.postal_code}`}
                        {shop.country && <><br />{shop.country}</>}
                      </p>
                    </div>
                  </div>
                )}

                {shop.phone && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="text-gray-900 font-medium">Phone</p>
                      <a href={`tel:${shop.phone}`} className="text-blue-600 hover:underline text-sm">
                        {shop.phone}
                      </a>
                    </div>
                  </div>
                )}

                {shop.email && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-gray-900 font-medium">Email</p>
                      <a href={`mailto:${shop.email}`} className="text-blue-600 hover:underline text-sm">
                        {shop.email}
                      </a>
                    </div>
                  </div>
                )}

                {shop.website && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <div>
                      <p className="text-gray-900 font-medium">Website</p>
                      <a href={shop.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                        {shop.website}
                      </a>
                    </div>
                  </div>
                )}

                {!shop.address && !shop.phone && !shop.email && !shop.website && (
                  <p className="text-gray-500 text-sm text-center py-4">No contact information available</p>
                )}
              </div>
            </div>

            {/* Shop Owner */}
            {shop.owner && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Shop Owner</h2>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {(shop.owner.name || shop.owner.username)?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{shop.owner.name || shop.owner.username}</p>
                    <p className="text-sm text-gray-600">@{shop.owner.username}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shop Message Modal - For Initial Message */}
      {shop && (
        <ShopMessageModal
          shopId={shop.id}
          shopName={shop.name}
          shopOwnerId={shop.user_id}
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
        />
      )}

      {/* Payment Settings Modal */}
      {isPaymentSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Payment Settings</h2>
              <button
                onClick={() => setIsPaymentSettingsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Bank Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Bank Account Details</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={paymentFormData.bank_name}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="e.g., Vietcombank, Techcombank"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={paymentFormData.account_number}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="e.g., 1234567890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={paymentFormData.account_holder}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, account_holder: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (Optional)</label>
                    <input
                      type="text"
                      value={paymentFormData.upi_id}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, upi_id: e.target.value }))}
                      placeholder="your@upi"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      value={paymentFormData.phone}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+84..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Payment QR Code</h3>
                  <button
                    onClick={generateQRCode}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Generate QR Code
                  </button>
                </div>

                {generatedQR && (
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                    <img
                      src={generatedQR}
                      alt="Payment QR Code"
                      className="max-w-[250px] max-h-[250px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> VietQR allows customers to scan and transfer money directly to your bank account.
                  </p>
                  <p className="text-xs text-blue-800">
                    Supported banks: vietcombank, techcombank, agribank, tpbank, mbbank, acb, bidv, vib, scb, sacombank, seabank, eximbank, vpbank, vietinbank and more.
                  </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
                <button
                  onClick={() => setIsPaymentSettingsOpen(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePaymentSettings}
                  disabled={savingPaymentSettings}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  {savingPaymentSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
