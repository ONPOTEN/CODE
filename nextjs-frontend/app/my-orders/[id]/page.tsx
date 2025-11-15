'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { orders, ApiException } from '@/lib/api';

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
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    async function fetchOrderDetail() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await orders.get(parseInt(orderId));
        setOrder(response.data || response.order || response);
      } catch (err) {
        let errorMsg = 'Failed to fetch order details';
        if (err instanceof ApiException) {
          errorMsg = err.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
        setError(errorMsg);
        console.error('Fetch order error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && isAuthenticated && orderId) {
      fetchOrderDetail();
    }
  }, [authLoading, isAuthenticated, orderId]);

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

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'Đơn giản':
        return 'Simple Product';
      case 'Biến thể':
        return 'Variant Product';
      case 'Tải xuống':
        return 'Download Product';
      default:
        return type;
    }
  };

  const getProductTypeBgColor = (type: string) => {
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

  if (error || !order) {
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The order you are looking for does not exist.'}</p>
            <Link
              href="/my-orders"
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
          <Link href="/my-orders" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Orders
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{order.order_number}</h1>
              <p className="text-gray-600">Order placed on {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">₫{(order.subtotal).toLocaleString('vi-VN')}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium text-gray-900">₫{(order.tax).toLocaleString('vi-VN')}</span>
              </div>
            )}
            {order.shipping_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping Fee:</span>
                <span className="font-medium text-gray-900">₫{(order.shipping_fee).toLocaleString('vi-VN')}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount:</span>
                <span className="font-medium">-₫{(order.discount).toLocaleString('vi-VN')}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Total:</span>
              <span className="text-lg font-bold text-green-600">₫{(order.total_amount).toLocaleString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.product_name}</h3>
                      <span className={`inline-block mt-1 px-2 py-1 rounded text-sm font-medium ${getProductTypeBgColor(item.product_type)}`}>
                        {getProductTypeLabel(item.product_type)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">₫{(item.subtotal).toLocaleString('vi-VN')}</p>
                      <p className="text-sm text-gray-600">₫{(item.unit_price).toLocaleString('vi-VN')} × {item.quantity}</p>
                    </div>
                  </div>

                  {/* Variant Options */}
                  {item.variant_options && Object.keys(item.variant_options).length > 0 && (
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Selected Options:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(item.variant_options).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-gray-600">{key}:</span>
                            <span className="font-medium text-gray-900 ml-2">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Download Files */}
                  {item.product_type === 'Tải xuống' && (
                    <div className="bg-blue-50 rounded p-3 mb-3">
                      <p className="text-sm font-medium text-blue-900 mb-2">Download Files:</p>
                      {item.download_files ? (
                        <a
                          href={item.download_files.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          {item.download_files.name || 'Download File'}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-600">No file available</p>
                      )}
                    </div>
                  )}

                  {/* Download Links */}
                  {item.product_type === 'Tải xuống' && item.link_files && item.link_files.length > 0 && (
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-sm font-medium text-green-900 mb-2">Download Links:</p>
                      <ul className="space-y-2">
                        {item.link_files.map((link: any, linkIdx: number) => (
                          <li key={linkIdx}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              {link.title || `Link ${linkIdx + 1}`}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No items in this order</p>
          )}
        </div>

        {/* Shipping Address */}
        {order.shipping_address && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping Address</h3>
              <div className="space-y-2 text-gray-700">
                <p>
                  <span className="font-medium">{order.shipping_address.full_name}</span>
                </p>
                <p>{order.shipping_address.address}</p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </p>
                <p className="text-sm">
                  <a href={`mailto:${order.shipping_address.email}`} className="text-blue-600 hover:text-blue-700">
                    {order.shipping_address.email}
                  </a>
                </p>
                <p className="text-sm">
                  <a href={`tel:${order.shipping_address.phone}`} className="text-blue-600 hover:text-blue-700">
                    {order.shipping_address.phone}
                  </a>
                </p>
              </div>
            </div>

            {/* Billing Address */}
            {order.billing_address && JSON.stringify(order.billing_address) !== JSON.stringify(order.shipping_address) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Billing Address</h3>
                <div className="space-y-2 text-gray-700">
                  <p>
                    <span className="font-medium">{order.billing_address.full_name}</span>
                  </p>
                  <p>{order.billing_address.address}</p>
                  <p>
                    {order.billing_address.city}, {order.billing_address.state} {order.billing_address.postal_code}
                  </p>
                  <p className="text-sm">
                    <a href={`mailto:${order.billing_address.email}`} className="text-blue-600 hover:text-blue-700">
                      {order.billing_address.email}
                    </a>
                  </p>
                  <p className="text-sm">
                    <a href={`tel:${order.billing_address.phone}`} className="text-blue-600 hover:text-blue-700">
                      {order.billing_address.phone}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Order Timeline</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Order Placed</p>
                <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${order.status !== 'pending' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Processing</p>
                <p className="text-sm text-gray-600">{order.status !== 'pending' ? 'In progress' : 'Waiting to process'}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${order.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Delivered</p>
                <p className="text-sm text-gray-600">{order.status === 'completed' ? 'Order completed' : 'Pending delivery'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            href="/my-orders"
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded text-center transition-colors"
          >
            Back to Orders
          </Link>
          {order.status === 'pending' && (
            <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded transition-colors">
              Cancel Order
            </button>
          )}
          {order.status === 'completed' && (
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded transition-colors">
              Return Item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
