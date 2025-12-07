'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { orders, ApiException, apiRequest } from '@/lib/api';

type PaymentMethod = 'cod' | 'qr';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, getTotalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  // Form state
  const [formData, setFormData] = useState({
    full_name: user?.display_name || user?.username || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shopQRCode, setShopQRCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [shopPaymentInfo, setShopPaymentInfo] = useState<{
    bank_name: string;
    account_number: string;
    account_holder: string;
  } | null>(null);
  const [orderReference] = useState(() => {
    // Generate a unique order reference for payment tracking
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DH${timestamp}${random}`;
  });

  const totalPrice = getTotalPrice();

  // Format price in VNĐ
  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(price)) + ' VNĐ';
  };

  // Bank code mapping for VietQR
  const bankCodes: Record<string, string> = {
    'Sacombank': '970403',
    'Vietcombank': '970436',
    'VCB': '970436',
    'Techcombank': '970407',
    'TCB': '970407',
    'BIDV': '970418',
    'Agribank': '970405',
    'VPBank': '970432',
    'MBBank': '970422',
    'MB': '970422',
    'ACB': '970416',
    'TPBank': '970423',
    'VIB': '970441',
    'SHB': '970443',
    'HDBank': '970437',
    'OCB': '970448',
    'SeABank': '970440',
    'MSB': '970426',
    'Eximbank': '970431',
    'LienVietPostBank': '970449',
    'Vietinbank': '970415',
    'CTG': '970415',
    'Nam A Bank': '970428',
    'Bac A Bank': '970409',
    'PVcomBank': '970412',
    'ABBank': '970425',
    'NCB': '970419',
    'Kienlongbank': '970452',
    'Dong A Bank': '970406',
    'GPBank': '970408',
    'BaoViet Bank': '970438',
    'VietABank': '970427',
    'Saigonbank': '970400',
  };

  // Load shop payment settings QR code
  useEffect(() => {
    const loadShopPaymentSettings = async () => {
      try {
        // Get shop ID from first item in cart
        if (!items || items.length === 0) return;

        // Extract shop_id from the first item (assuming all items are from same shop)
        const firstItem = items[0];
        const shopId = firstItem.shopId;

        if (!shopId) {
          console.log('No shopId found in cart item');
          return;
        }

        setLoadingQR(true);
        try {
          // Load payment settings for this shop
          const paymentSettingsResponse = await apiRequest(`/shops/${shopId}/payment-settings`);
          const settings = paymentSettingsResponse?.data;

          // Save shop payment info for display
          if (settings?.bank_name && settings?.account_number && settings?.account_holder) {
            setShopPaymentInfo({
              bank_name: settings.bank_name,
              account_number: settings.account_number,
              account_holder: settings.account_holder,
            });
          }

          if (!settings?.qr_code) {
            // Use saved QR code
            setShopQRCode(settings.qr_code);
          } else if (settings?.bank_name && settings?.account_number && settings?.account_holder) {
            // Auto-generate QR code if bank info exists but no QR saved
            const bankName = settings.bank_name;
            let bankCode = bankCodes[bankName];

            // Try partial match if exact match not found
            if (!bankCode) {
              const bankNameLower = bankName.toLowerCase();
              for (const [name, code] of Object.entries(bankCodes)) {
                if (bankNameLower.includes(name.toLowerCase()) || name.toLowerCase().includes(bankNameLower)) {
                  bankCode = code;
                  break;
                }
              }
            }

            if (bankCode) {
              const amount = Math.round(totalPrice);
              // Format: "DH123ABC TT 790000d" - Order reference + Total price
              const addInfo = `${orderReference} TT ${amount.toLocaleString('vi-VN')}d`;
              const qrUrl = `https://img.vietqr.io/image/${bankCode}-${settings.account_number}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(settings.account_holder)}`;
              console.log("qrUrl:" + qrUrl);
              setShopQRCode(qrUrl);
            }
          }
        } catch (err) {
          console.log('Could not load QR code for this shop:', err);
          // This is not critical - QR code is optional
        } finally {
          setLoadingQR(false);
        }
      } catch (err) {
        console.error('Error loading shop payment settings:', err);
      }
    };

    loadShopPaymentSettings();
  }, [items, totalPrice, orderReference]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate shipping address for all payment methods
    if (!formData.full_name.trim()) newErrors.full_name = 'Họ tên là bắt buộc';
    if (!formData.email.trim()) newErrors.email = 'Email là bắt buộc';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email không hợp lệ';
    if (!formData.phone.trim()) newErrors.phone = 'Điện thoại là bắt buộc';
    if (!formData.address.trim()) newErrors.address = 'Địa chỉ là bắt buộc';
    if (!formData.city.trim()) newErrors.city = 'Thành phố là bắt buộc';
    if (!formData.state.trim()) newErrors.state = 'Tỉnh/Thành là bắt buộc';
    if (!formData.postal_code.trim()) newErrors.postal_code = 'Mã bưu điện là bắt buộc';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (items.length === 0) {
      setErrorMessage('Giỏ hàng của bạn đang trống');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Prepare order items
      const orderItems = items.map((item) => ({
        shop_post_id: item.postId,
        quantity: item.quantity,
        variant_options: item.attributes && Object.keys(item.attributes).length > 0 ? item.attributes : null,
      }));

      // Prepare shipping address
      const shippingAddress = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
      };

      // Send order to backend
      const response = await orders.create({
        items: orderItems,
        subtotal: totalPrice,
        tax: 0,
        shipping_fee: 0,
        discount: 0,
        total_amount: totalPrice,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        order_reference: orderReference,
      });

      console.log('Order created successfully:', response);

      // Show success and clear cart
      setOrderPlaced(true);
      clearCart();

      // Redirect to my-orders page after 3 seconds
      setTimeout(() => {
        router.push('/my-orders');
      }, 3000);
    } catch (error) {
      console.error('Order creation failed:', error);

      let errorMsg = 'Không thể đặt hàng. Vui lòng thử lại.';
      if (error instanceof ApiException) {
        errorMsg = error.message;
        // Log validation errors for debugging
        if (error.errors) {
          console.error('Validation errors:', error.errors);
          // Show first validation error if available
          const firstErrorKey = Object.keys(error.errors)[0];
          if (firstErrorKey && error.errors[firstErrorKey]?.[0]) {
            errorMsg = error.errors[firstErrorKey][0];
          }
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-600 mb-6">Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán.</p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại mua sắm
          </Link>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-grey-200 rounded-lg shadow-lg p-12 text-center max-w-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt hàng thành công!</h2>
          <p className="text-gray-600 mb-4">Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đã được xác nhận.</p>
          <p className="text-sm text-gray-500 mb-6">
            Bạn sẽ được chuyển hướng về trang chủ ngay...
          </p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 5h4" />
            </svg>
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-grey-200 border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Link href="/cart" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Giỏ hàng
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-600 font-medium">Thanh toán</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            {errorMessage && (
              <div className="mb-6 bg-blue-500 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handlePlaceOrder} className="space-y-6">
              {/* Shipping Address Section */}
              <div className="bg-grey-200 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Địa chỉ giao hàng</h2>
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.full_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nguyễn Văn A"
                    />
                    {errors.full_name && <p className="text-red-600 text-sm mt-1">{errors.full_name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="john@example.com"
                    />
                    {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0901234567"
                    />
                    {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123 Đường ABC, Phường XYZ"
                    />
                    {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
                  </div>

                  {/* City, State, Postal Code */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thành phố</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="TP. Hồ Chí Minh"
                      />
                      {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.state ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Quận 1"
                      />
                      {errors.state && <p className="text-red-600 text-xs mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mã bưu điện</label>
                      <input
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.postal_code ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="700000"
                      />
                      {errors.postal_code && <p className="text-red-600 text-xs mt-1">{errors.postal_code}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="bg-grey-200 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Phương thức thanh toán</h2>
                <div className="space-y-4">
                  {/* Payment Method Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* COD Option */}
                    <label className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-green-500 bg-grey-200'
                        : 'border-gray-300 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="mt-1 cursor-pointer"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-semibold text-gray-900">Thanh toán khi nhận hàng</p>
                        <p className="text-sm text-gray-600">Thanh toán khi bạn nhận được đơn hàng</p>
                      </div>
                      {paymentMethod === 'cod' && (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>

                    {/* QR Code Payment Option */}
                    <label className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === 'qr'
                        ? 'border-blue-500 bg-grey-200'
                        : 'border-gray-300 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="qr"
                        checked={paymentMethod === 'qr'}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="mt-1 cursor-pointer"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-semibold text-gray-900">Thanh toán QR Code</p>
                        <p className="text-sm text-gray-600">Quét mã và thanh toán ngay</p>
                      </div>
                      {paymentMethod === 'qr' && (
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  </div>

                  {/* COD Info */}
                  {paymentMethod === 'cod' && (
                    <div className="bg-grey-200 border border-green-200 rounded-lg p-4">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="font-semibold text-green-900 text-sm">Thanh toán khi nhận hàng</p>
                          <p className="text-green-800 text-sm mt-1">Bạn sẽ thanh toán {formatVND(totalPrice)} khi người giao hàng đến nơi.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR Code Payment Info */}
                  {paymentMethod === 'qr' && (
                    <div className="bg-grey-200 border border-blue-200 rounded-lg p-4 space-y-4">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="font-semibold text-blue-900 text-sm">Thanh toán QR Code</p>
                          <p className="text-blue-800 text-sm mt-1">Quét mã QR bên dưới bằng ứng dụng thanh toán để trả {formatVND(totalPrice)}</p>
                        </div>
                      </div>
                      <div className="bg-grey-200 p-4 rounded border border-blue-200">
                        {loadingQR ? (
                          <div className="flex items-center justify-center min-h-[200px]">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-gray-600 text-sm">Đang tải mã QR...</p>
                            </div>
                          </div>
                        ) : shopQRCode ? (
                          <div className="flex items-center justify-center min-h-[200px]">
                            <img
                              src={shopQRCode}
                              alt="Payment QR Code"
                              className="max-w-[300px] max-h-[300px] object-contain"
                              onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded p-4 flex items-center justify-center min-h-[200px]">
                            <div className="text-center">
                              <svg className="w-16 h-16 text-gray-900 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M4 4h7v7H4V4zm2 2v3h3V6H6zM13 4h7v7h-7V4zm2 2v3h3V6h-3zM4 13h7v7H4v-7zm2 2v3h3v-3H6zm9 0v1h1v-1h-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1v1h1v-1h-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1z" />
                              </svg>
                              <p className="text-gray-900 text-xs font-medium">Mã QR</p>
                              <p className="text-blue-100 text-xs mt-1">Số tiền: {formatVND(totalPrice)}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Order Reference ID */}
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mt-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-yellow-700">Mã đơn hàng (Nội dung chuyển khoản)</p>
                            <p className="font-bold text-yellow-900 text-lg">{orderReference}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(orderReference);
                            }}
                            className="px-3 py-1 text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 rounded transition-colors"
                          >
                            Sao chép
                          </button>
                        </div>
                        <p className="text-xs text-yellow-600 mt-2">
                          Vui lòng ghi mã này vào nội dung chuyển khoản để chúng tôi xác nhận thanh toán.
                        </p>
                      </div>

                      {/* Shop Payment Info */}
                      {shopPaymentInfo && (
                        <div className="bg-white p-4 rounded border border-blue-200 mt-4">
                          <h4 className="font-semibold text-gray-900 text-sm mb-3">Thông tin tài khoản nhận tiền</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Ngân hàng:</span>
                              <span className="font-medium text-gray-900">{shopPaymentInfo.bank_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Số tài khoản:</span>
                              <span className="font-medium text-gray-900">{shopPaymentInfo.account_number}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Chủ tài khoản:</span>
                              <span className="font-medium text-gray-900">{shopPaymentInfo.account_holder}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                              <span className="text-gray-600">Số tiền:</span>
                              <span className="font-bold text-green-600">{formatVND(totalPrice)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-700 disabled:bg-blue-400 text-gray-900 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {paymentMethod === 'cod' ? 'Đặt hàng' : 'Đặt hàng & Thanh toán QR'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-grey-200 rounded-lg shadow-md p-6 sticky top-20 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Tóm tắt đơn hàng</h2>

              {/* Items List */}
              <div className="space-y-3 border-b border-gray-300 pb-4">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.title} x{item.quantity}</span>
                    <span className="font-medium text-gray-900">{formatVND(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Tổng cộng:</span>
                  <span className="text-green-600">{formatVND(totalPrice)}</span>
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-grey-200 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span className="text-xs text-blue-800 font-medium">Thanh toán an toàn</span>
                </div>
                <p className="text-xs text-blue-700">
                  Thông tin thanh toán của bạn được mã hóa và xử lý an toàn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
