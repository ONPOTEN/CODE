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
import VideoPlayer from '@/components/VideoPlayer';
import ShopActionButtons from '@/components/ShopActionButtons';
import ShopHero from '@/components/ShopHero';
import ShopContactCard from '@/components/ShopContactCard';
import ShopImagesCarousel from '@/components/ShopImagesCarousel';
import ShopProductsSection from '@/components/ShopProductsSection';

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const shopId = Number(params.id);

  const [shop, setShop] = useState<Shop | null>(null);
  const [allPosts, setAllPosts] = useState<ShopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [allProductsSearch, setAllProductsSearch] = useState('');

  const isOwner = Boolean(user && shop && shop.user_id === user.id);

  useEffect(() => {
    fetchShopData();
  }, [shopId]);

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
        setError('Không thể tải cửa hàng');
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
      alert('Vui lòng điền tên ngân hàng và số tài khoản');
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
      alert('Không thể tạo mã QR. Vui lòng kiểm tra thông tin ngân hàng và thử lại.');
    }
  };

  const savePaymentSettings = async () => {
    if (!paymentFormData.bank_name || !paymentFormData.account_number || !paymentFormData.account_holder) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc');
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

      alert('Đã lưu cài đặt thanh toán thành công!');
      setIsPaymentSettingsOpen(false);
    } catch (err) {
      console.error('Error saving payment settings:', err);
      const errorMsg = err instanceof Error ? err.message : 'Không thể lưu cài đặt thanh toán';
      alert(`${errorMsg}`);
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy cửa hàng</h2>
          <p className="text-gray-600 mb-6">{error || 'Cửa hàng bạn đang tìm kiếm không tồn tại.'}</p>
          <Link
            href="/shops"
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <ShopHero
        name={shop.name}
        description={shop.description}
        logo={shop.logo}
        banner={shop.banner}
        status={shop.status}
        isOwner={isOwner}
        shopId={shop.id}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* Action Buttons */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 014.899-4.899l-4.899-4.899A4 4 0 004.899 4.899L8 8.5m0 0l4 4m-4-4l4 4" />
                </svg>
                Thao tác nhanh
              </h3>
              <ShopActionButtons
                shopName={shop.name}
                shopPhone={shop.phone}
                shopAddress={shop.address}
                onMessageClick={() => setIsMessageModalOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Images Carousel */}
        <ShopImagesCarousel
          image1={shop.image_1}
          image2={shop.image_2}
          image3={shop.image_3}
          image4={shop.image_4}
          image5={shop.image_5}
        />

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Contact & Messages */}
          <div className="space-y-4 md:space-y-6">
            <ShopContactCard
              address={shop.address}
              phone={shop.phone}
              email={shop.email}
              website={shop.website}
              city={shop.city}
              state={shop.state}
              postalCode={shop.postal_code}
              country={shop.country}
              owner={shop.owner}
            />

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
          </div>

          {/* Right Column - Products */}
          <div className="md:col-span-2">
            <ShopProductsSection
              activeView={productTypeView}
              onViewChange={setProductTypeView}
              shopId={shopId}
              isOwner={isOwner}
              onPaymentSettingsClick={openPaymentSettings}
            >
              {productTypeView === 'all' && (
                <>
                  {/* Unified Search Box for All Products */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Tìm kiếm tất cả sản phẩm..."
                        value={allProductsSearch}
                        onChange={(e) => setAllProductsSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                      {allProductsSearch && (
                        <button
                          onClick={() => setAllProductsSearch('')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                          <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <SimpleProductsList shopId={shopId} externalSearch={allProductsSearch} hideSearch={true} />
                  <VariantProductsList shopId={shopId} externalSearch={allProductsSearch} hideSearch={true} />
                  <DownloadProductsList shopId={shopId} externalSearch={allProductsSearch} hideSearch={true} />
                </>
              )}
              {productTypeView === 'simple' && <SimpleProductsList shopId={shopId} />}
              {productTypeView === 'variant' && <VariantProductsList shopId={shopId} />}
              {productTypeView === 'download' && <DownloadProductsList shopId={shopId} />}
            </ShopProductsSection>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-white">Cài đặt thanh toán</h2>
              <button
                onClick={() => setIsPaymentSettingsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Bank Details Section */}
              <div className="space-y-4">
                <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Thông tin tài khoản ngân hàng
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tên ngân hàng</label>
                    <input
                      type="text"
                      value={paymentFormData.bank_name}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                      placeholder="VD: Vietcombank, Techcombank"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Số tài khoản</label>
                    <input
                      type="text"
                      value={paymentFormData.account_number}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, account_number: e.target.value }))}
                      placeholder="VD: 1234567890"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    value={paymentFormData.account_holder}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, account_holder: e.target.value }))}
                    placeholder="Họ tên đầy đủ của bạn"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">UPI ID (Tùy chọn)</label>
                    <input
                      type="text"
                      value={paymentFormData.upi_id}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, upi_id: e.target.value }))}
                      placeholder="your@upi"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại (Tùy chọn)</label>
                    <input
                      type="tel"
                      value={paymentFormData.phone}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+84..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="border-t-2 border-gray-100 pt-4 md:pt-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2m0 0l-3 5m3-5l3 5m-3-5h6m-6 5h6" />
                    </svg>
                    Mã QR thanh toán
                  </h3>
                  <button
                    onClick={generateQRCode}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tạo mã QR
                  </button>
                </div>

                {generatedQR && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 md:p-6 flex items-center justify-center mt-4">
                    <img
                      src={generatedQR}
                      alt="Mã QR thanh toán"
                      className="max-w-[180px] md:max-w-[280px] max-h-[180px] md:max-h-[280px] object-contain shadow-lg rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 md:p-5">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  VietQR cho phép khách hàng quét và chuyển tiền trực tiếp vào tài khoản ngân hàng của bạn.
                </p>
                <p className="text-xs md:text-sm text-blue-800">
                  Ngân hàng hỗ trợ: Vietcombank, Techcombank, Agribank, TPBank, MB Bank, ACB, BIDV, VIB, SCB, Sacombank, SeABank, Eximbank, VPBank, VietinBank và nhiều hơn nữa.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3 pt-4 border-t-2 border-gray-100">
                <button
                  onClick={() => setIsPaymentSettingsOpen(false)}
                  className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={savePaymentSettings}
                  disabled={savingPaymentSettings}
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  {savingPaymentSettings ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
