'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { orders, shops, ApiException } from '@/lib/api';

interface OrderItem {
  id: number;
  product_name: string;
  product_type: 'Đơn giản' | 'Biến thể' | 'Tải xuống';
  quantity: number;
  unit_price: number;
  subtotal: number;
  variant_options?: Record<string, string>;
  download_files?: any;
  link_files?: any[];
}

interface OrderDetail {
  id: number;
  order_number: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  subtotal: number;
  tax: number;
  shipping_fee: number;
  discount: number;
  total_amount: number;
  notes?: string;
  shipping_address?: any;
  billing_address?: any;
  customer?: any;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export default function ShopOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = parseInt(params.id as string);
  const orderId = parseInt(params.orderId as string);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [shop, setShop] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // Authentication & permission check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch shop and order details
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch shop details
        const shopInfo = await shops.getById(shopId);

        // Check if user owns this shop
        if (shopInfo.user_id !== user?.id) {
          setError('You do not have permission to view this shop\'s orders');
          return;
        }

        setShop(shopInfo);

        // Fetch order details
        const orderData = await orders.get(orderId);
        const orderDetail = orderData.data || orderData.order || orderData;

        // Verify order belongs to this shop
        if (orderDetail.shop_id !== shopId) {
          setError('This order does not belong to your shop');
          return;
        }

        setOrder(orderDetail);
        setSelectedStatus(orderDetail.status);
      } catch (err) {
        let errorMsg = 'Failed to fetch order details';
        if (err instanceof ApiException) {
          errorMsg = err.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
        setError(errorMsg);
        console.error('Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && isAuthenticated && user && shopId && orderId) {
      fetchData();
    }
  }, [authLoading, isAuthenticated, user, shopId, orderId]);

  const handleStatusUpdate = async () => {
    if (!order || selectedStatus === order.status) {
      return;
    }

    setStatusLoading(true);
    setUpdateMessage(null);

    try {
      await orders.updateStatus(orderId, selectedStatus as any);
      setOrder({ ...order, status: selectedStatus as any });
      setUpdateMessage('Order status updated successfully');

      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (err) {
      let errorMsg = 'Failed to update order status';
      if (err instanceof ApiException) {
        errorMsg = err.message;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      setUpdateMessage(errorMsg);
      setSelectedStatus(order.status);
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getProductTypeColor = (type: string) => {
    switch (type) {
      case 'Đơn giản':
        return 'bg-blue-100 text-blue-800';
      case 'Biến thể':
        return 'bg-purple-100 text-purple-800';
      case 'Tải xuống':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href={`/shops/${shopId}/orders`}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h3>
            <p className="text-gray-600 mb-6">The order you're looking for could not be found.</p>
            <Link
              href={`/shops/${shopId}/orders`}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/shops/${shopId}/orders`}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-gray-600 mt-2">
            Order Date: {new Date(order.created_at).toLocaleDateString('vi-VN')}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Update Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Status</h2>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={handleStatusUpdate}
                  disabled={statusLoading || selectedStatus === order.status}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
                >
                  {statusLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
              {updateMessage && (
                <div className={`mt-4 p-3 rounded ${updateMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {updateMessage}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">Quantity: {item.quantity}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProductTypeColor(item.product_type)}`}>
                          {item.product_type}
                        </span>
                      </div>

                      {/* Variant Options */}
                      {item.product_type === 'Biến thể' && item.variant_options && Object.keys(item.variant_options).length > 0 && (
                        <div className="mb-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Selected Options:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(item.variant_options).map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="font-medium text-gray-700">{key}:</span>
                                <span className="text-gray-600 ml-1">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Download Files */}
                      {item.product_type === 'Tải xuống' && (
                        <div className="mb-3 space-y-2">
                          {item.download_files && item.download_files.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Download Files:</p>
                              <div className="space-y-1">
                                {item.download_files.map((file: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={file.url || file}
                                    download
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    {typeof file === 'string' ? file.split('/').pop() : file.name || `File ${idx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.link_files && item.link_files.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">External Links:</p>
                              <div className="space-y-1">
                                {item.link_files.map((link: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={link.url || link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    {link.label || `Link ${idx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="border-t border-gray-200 pt-3 text-right">
                        <p className="text-sm text-gray-600">
                          ₫{(item.unit_price).toLocaleString('vi-VN')} × {item.quantity} = <span className="font-semibold text-gray-900">₫{(item.subtotal).toLocaleString('vi-VN')}</span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No items in this order</p>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Shipping Address</h2>
                <div className="space-y-2 text-gray-700">
                  <p className="font-semibold">{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </p>
                  <p className="text-sm">Phone: {order.shipping_address.phone}</p>
                  <p className="text-sm">Email: {order.shipping_address.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Info */}
            {order.customer && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Customer</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Name</p>
                    <p className="font-semibold text-gray-900">{order.customer.display_name || order.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    <p className="text-gray-700">{order.customer.user_email || order.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">User ID</p>
                    <p className="text-gray-700">#{order.customer.id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">₫{(order.subtotal).toLocaleString('vi-VN')}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="text-gray-900">₫{(order.tax).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                {order.shipping_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="text-gray-900">₫{(order.shipping_fee).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-red-600">-₫{(order.discount).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="font-bold text-lg text-blue-600">₫{(order.total_amount).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Order Placed</p>
                    <p className="text-gray-600">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>

                {order.status !== 'pending' && (
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                      ['processing', 'completed'].includes(order.status) ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Processing</p>
                      <p className="text-gray-600">{new Date(order.updated_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                )}

                {order.status === 'completed' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Delivered</p>
                      <p className="text-gray-600">{new Date(order.updated_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
