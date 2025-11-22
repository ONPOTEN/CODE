'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { orders, ApiException, apiRequest } from '@/lib/api';

type PaymentMethod = 'cod' | 'qr' | 'bank_transfer';

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
    bank_name: '',
    account_number: '',
    account_holder: user?.display_name || user?.username || '',
    transfer_reference: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shopQRCode, setShopQRCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  const totalPrice = getTotalPrice();

  // Load shop payment settings QR code
  useEffect(() => {
    const loadShopPaymentSettings = async () => {
      try {
        // Get shop ID from first item in cart
        if (!items || items.length === 0) return;

        // Extract shop_id from the first item (assuming all items are from same shop)
        // For now, we'll try to get it from the cart item structure
        const firstItem = items[0];

        // Try to load payment settings
        // We need the shopId - let's make a request to get it from the shop post
        if (firstItem.postId) {
          setLoadingQR(true);
          try {
            // Get the shop post details to find the shop ID
            const shopPostResponse = await apiRequest(`/shops/1/posts/${firstItem.postId}`);
            const shopId = shopPostResponse?.data?.shop_id || shopPostResponse?.shop_id;

            if (shopId) {
              // Load payment settings for this shop
              const paymentSettingsResponse = await apiRequest(`/shops/${shopId}/payment-settings`);

              if (paymentSettingsResponse?.data?.qr_code) {
                setShopQRCode(paymentSettingsResponse.data.qr_code);
              }
            }
          } catch (err) {
            console.log('Could not load QR code for this shop:', err);
            // This is not critical - QR code is optional
          } finally {
            setLoadingQR(false);
          }
        }
      } catch (err) {
        console.error('Error loading shop payment settings:', err);
      }
    };

    loadShopPaymentSettings();
  }, [items]);

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
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.postal_code.trim()) newErrors.postal_code = 'Postal code is required';

    // Validate payment method-specific fields
    if (paymentMethod === 'bank_transfer') {
      if (!formData.bank_name.trim()) newErrors.bank_name = 'Bank name is required';
      if (!formData.account_number.trim()) newErrors.account_number = 'Account number is required';
      if (!formData.account_holder.trim()) newErrors.account_holder = 'Account holder name is required';
      if (!formData.transfer_reference.trim()) newErrors.transfer_reference = 'Transfer reference is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (items.length === 0) {
      setErrorMessage('Your cart is empty');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Prepare order items
      const orderItems = items.map((item) => ({
        shop_post_id: item.postId,
        quantity: item.quantity,
        variant_options: item.attributes || {},
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

      // Prepare bank transfer details if applicable
      let bankTransferDetails = undefined;
      if (paymentMethod === 'bank_transfer') {
        bankTransferDetails = {
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          account_holder: formData.account_holder,
          transfer_reference: formData.transfer_reference,
        };
      }

      // Send order to backend
      const response = await orders.create({
        items: orderItems,
        subtotal: totalPrice,
        tax: 0,
        shipping_fee: 0,
        discount: 0,
        total_amount: totalPrice,
        notes: '',
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        bank_transfer_details: bankTransferDetails,
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

      let errorMsg = 'Failed to place order. Please try again.';
      if (error instanceof ApiException) {
        errorMsg = error.message;
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cart is Empty</h2>
          <p className="text-gray-600 mb-6">Please add items to your cart before checking out.</p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Shopping
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
          <p className="text-gray-600 mb-4">Thank you for your purchase. Your order has been confirmed.</p>
          <p className="text-sm text-gray-500 mb-6">
            You will be redirected to the home page shortly...
          </p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 5h4" />
            </svg>
            Go Home
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
              Cart
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-600 font-medium">Checkout</span>
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.full_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="John Doe"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+1 (555) 000-0000"
                    />
                    {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123 Main Street"
                    />
                    {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
                  </div>

                  {/* City, State, Postal Code */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="New York"
                      />
                      {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.state ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="NY"
                      />
                      {errors.state && <p className="text-red-600 text-xs mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.postal_code ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="10001"
                      />
                      {errors.postal_code && <p className="text-red-600 text-xs mt-1">{errors.postal_code}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="bg-grey-200 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
                <div className="space-y-4">
                  {/* Payment Method Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <p className="font-semibold text-gray-900">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
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
                        <p className="font-semibold text-gray-900">QR Code Payment</p>
                        <p className="text-sm text-gray-600">Scan and pay instantly</p>
                      </div>
                      {paymentMethod === 'qr' && (
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>

                    {/* Bank Transfer Option */}
                    <label className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-purple-500 bg-grey-200'
                        : 'border-gray-300 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="bank_transfer"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="mt-1 cursor-pointer"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-semibold text-gray-900">Bank Transfer</p>
                        <p className="text-sm text-gray-600">Transfer to our bank account</p>
                      </div>
                      {paymentMethod === 'bank_transfer' && (
                        <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
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
                          <p className="font-semibold text-green-900 text-sm">Payment on Delivery</p>
                          <p className="text-green-800 text-sm mt-1">You will pay ${totalPrice.toFixed(2)} when the delivery person arrives at your doorstep.</p>
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
                          <p className="font-semibold text-blue-900 text-sm">QR Code Payment</p>
                          <p className="text-blue-800 text-sm mt-1">Scan the QR code below with your mobile payment app to pay ${totalPrice.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="bg-grey-200 p-4 rounded border border-blue-200">
                        {loadingQR ? (
                          <div className="flex items-center justify-center min-h-[200px]">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-gray-600 text-sm">Loading QR code...</p>
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
                              <p className="text-gray-900 text-xs font-medium">QR Code</p>
                              <p className="text-blue-100 text-xs mt-1">Amount: ${totalPrice.toFixed(2)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bank Transfer Form */}
                  {paymentMethod === 'bank_transfer' && (
                    <div className="bg-grey-200 border border-purple-200 rounded-lg p-4 space-y-4">
                      <div className="flex gap-3 mb-4">
                        <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="font-semibold text-purple-900 text-sm">Bank Transfer Details</p>
                          <p className="text-purple-800 text-sm mt-1">Please transfer ${totalPrice.toFixed(2)} to the bank account below</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Bank Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                          <input
                            type="text"
                            name="bank_name"
                            value={formData.bank_name}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errors.bank_name ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., Vietnam Bank / Techcombank"
                          />
                          {errors.bank_name && <p className="text-red-600 text-sm mt-1">{errors.bank_name}</p>}
                        </div>

                        {/* Account Number */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                          <input
                            type="text"
                            name="account_number"
                            value={formData.account_number}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errors.account_number ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="0123456789"
                          />
                          {errors.account_number && <p className="text-red-600 text-sm mt-1">{errors.account_number}</p>}
                        </div>

                        {/* Account Holder */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                          <input
                            type="text"
                            name="account_holder"
                            value={formData.account_holder}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errors.account_holder ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Account holder name"
                          />
                          {errors.account_holder && <p className="text-red-600 text-sm mt-1">{errors.account_holder}</p>}
                        </div>

                        {/* Transfer Reference */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Reference / Description</label>
                          <input
                            type="text"
                            name="transfer_reference"
                            value={formData.transfer_reference}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errors.transfer_reference ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., Order #12345"
                          />
                          {errors.transfer_reference && <p className="text-red-600 text-sm mt-1">{errors.transfer_reference}</p>}
                        </div>

                        <div className="bg-grey-200 rounded p-3 border border-purple-200">
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Important:</span> Please use the transfer reference as the description/memo when making your bank transfer. This helps us match your payment with your order.
                          </p>
                        </div>
                      </div>
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
                    Processing...
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
                    {paymentMethod === 'cod'
                      ? 'Place Order'
                      : paymentMethod === 'qr'
                      ? 'Place Order & Pay with QR'
                      : 'Place Order & Send Payment'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-grey-200 rounded-lg shadow-md p-6 sticky top-20 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>

              {/* Items List */}
              <div className="space-y-3 border-b border-gray-300 pb-4">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.title} x{item.quantity}</span>
                    <span className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total:</span>
                  <span className="text-green-600">${totalPrice.toFixed(2)}</span>
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
                  <span className="text-xs text-blue-800 font-medium">Secure Payment</span>
                </div>
                <p className="text-xs text-blue-700">
                  Your payment information is encrypted and processed securely.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
