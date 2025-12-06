'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { orders, shopPosts, ApiException } from '@/lib/api';

interface OrderItem {
  id: number;
  shop_post_id?: number;
  product_name: string;
  product_type: 'Đơn giản' | 'Biến thể' | 'Tải xuống';
  quantity: number;
  unit_price: number;
  subtotal: number;
  variant_options?: Record<string, string>;
  download_files?: any;
  link_files?: any[];
  product?: any; // Product details loaded from API
}

interface OrderDetail {
  id: number;
  order_number: string;
  shop_id?: number;
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
        const orderData = response.data || response.order || response;

        // For completed orders with download products, ALWAYS fetch product details to get download_files and link_files
        if (orderData.status === 'completed' && orderData.items && orderData.shop_id) {
          const downloadItems = orderData.items.filter(
            (item: OrderItem) => item.product_type === 'Tải xuống'
          );

          // Fetch product details for ALL download items to ensure we have the latest files
          for (const item of downloadItems) {
            // Always try to fetch product details for download products
            if (item.shop_post_id) {
              try {
                const productResponse = await shopPosts.getById(orderData.shop_id, item.shop_post_id);
                const product = productResponse && typeof productResponse === 'object' && 'id' in productResponse
                  ? productResponse
                  : (productResponse as any)?.data;

                if (product) {
                  // Always use the product's files (they may have been updated after order was placed)
                  item.download_files = product.download_files;
                  item.link_files = product.link_files;
                  item.product = product;
                }
              } catch (err) {
                console.error('Error fetching product details for download item:', err);
              }
            }
          }
        }

        setOrder(orderData);
      } catch (err) {
        let errorMsg = 'Không thể tải chi tiết đơn hàng';
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
        return 'bg-blue-500 text-green-800';
      case 'processing':
        return 'bg-blue-500 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-blue-500 text-red-800';
      default:
        return 'bg-blue-500 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'processing':
        return 'Đang xử lý';
      case 'pending':
        return 'Chờ xử lý';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'Đơn giản':
        return 'Sản phẩm đơn giản';
      case 'Biến thể':
        return 'Sản phẩm biến thể';
      case 'Tải xuống':
        return 'Sản phẩm tải xuống';
      default:
        return type;
    }
  };

  const getProductTypeBgColor = (type: string) => {
    switch (type) {
      case 'Đơn giản':
        return 'bg-blue-500 text-blue-800';
      case 'Biến thể':
        return 'bg-blue-500 text-purple-800';
      case 'Tải xuống':
        return 'bg-blue-500 text-green-800';
      default:
        return 'bg-blue-500 text-gray-800';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white py-12">
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
            <p className="text-gray-600">Đang tải chi tiết đơn hàng...</p>
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
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-grey-200 rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy đơn hàng</h2>
            <p className="text-gray-600 mb-6">{error || 'Đơn hàng bạn đang tìm kiếm không tồn tại.'}</p>
            <Link
              href="/my-orders"
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Quay lại danh sách đơn hàng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/my-orders" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại danh sách đơn hàng
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{order.order_number}</h1>
              <p className="text-gray-600">Đặt hàng ngày {new Date(order.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="bg-grey-200 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Tạm tính:</span>
              <span className="font-medium text-gray-900">₫{(order.subtotal).toLocaleString('vi-VN')}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Thuế:</span>
                <span className="font-medium text-gray-900">₫{(order.tax).toLocaleString('vi-VN')}</span>
              </div>
            )}
            {order.shipping_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Phí vận chuyển:</span>
                <span className="font-medium text-gray-900">₫{(order.shipping_fee).toLocaleString('vi-VN')}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Giảm giá:</span>
                <span className="font-medium">-₫{(order.discount).toLocaleString('vi-VN')}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Tổng cộng:</span>
              <span className="text-lg font-bold text-green-600">₫{(order.total_amount).toLocaleString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-grey-200 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sản phẩm trong đơn hàng</h2>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4">
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
                    <div className="bg-white rounded p-3 mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Tùy chọn đã chọn:</p>
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

                  {/* Download Product Section */}
                  {item.product_type === 'Tải xuống' && (
                    <div className="mt-3">
                      {order.status === 'completed' ? (
                        <>
                          {/* Downloadable Files - New Design */}
                          {item.download_files && (Array.isArray(item.download_files) ? item.download_files.length > 0 : (typeof item.download_files === 'object' ? Object.keys(item.download_files).length > 0 : !!item.download_files)) && (
                            <div className="border border-green-300 rounded-lg p-4 bg-grey-200 mb-3">
                              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <span>📁</span> Tệp tải xuống
                              </h4>
                              <div className="space-y-3">
                                {(Array.isArray(item.download_files) ? item.download_files : [item.download_files]).map((file: any, fileIdx: number) => {
                                  const fileName = typeof file === 'string' ? file.split('/').pop() : file.name || `File ${fileIdx + 1}`;
                                  const fileSize = file.size ? `${(file.size / 1024).toFixed(2)} KB` : null;
                                  const fileUrl = typeof file === 'string' ? file : file.url || file;

                                  return (
                                    <div key={fileIdx} className="flex items-start justify-between bg-grey-200 p-4 rounded border border-green-200">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                          </svg>
                                          <p className="font-medium text-gray-900">{fileName}</p>
                                        </div>
                                        {fileSize && <p className="text-xs text-gray-500">Kích thước: {fileSize}</p>}
                                      </div>
                                      <a
                                        href={fileUrl}
                                        download
                                        className="ml-2 px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors flex-shrink-0 flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Tải xuống
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* External Links - New Design */}
                          {item.link_files && item.link_files.length > 0 && (
                            <div className="border border-blue-300 rounded-lg p-4 bg-grey-200">
                              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <span>🔗</span> Liên kết bên ngoài
                              </h4>
                              <div className="space-y-3">
                                {item.link_files.map((link: any, linkIdx: number) => {
                                  const linkTitle = link.title || link.label || `Link ${linkIdx + 1}`;
                                  const linkUrl = link.url || link;

                                  return (
                                    <div key={linkIdx} className="flex items-start justify-between bg-grey-200 p-4 rounded border border-blue-200">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                          <p className="font-medium text-gray-900">{linkTitle}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{linkUrl}</p>
                                      </div>
                                      <a
                                        href={linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors flex-shrink-0 flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Mở
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* No downloads available - only show if product has NO download files AND NO link files */}
                          {(() => {
                            const hasDownloadFiles = item.download_files && (
                              Array.isArray(item.download_files)
                                ? item.download_files.length > 0
                                : (typeof item.download_files === 'object'
                                    ? Object.keys(item.download_files).length > 0
                                    : !!item.download_files)
                            );
                            const hasLinkFiles = item.link_files && item.link_files.length > 0;

                            if (!hasDownloadFiles && !hasLinkFiles) {
                              return (
                                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span>ℹ️</span> Chưa có tệp tải xuống
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    Sản phẩm này chưa có tệp tải xuống hoặc liên kết bên ngoài nào được cấu hình. Vui lòng liên hệ người bán để được hỗ trợ.
                                  </p>
                                  {order.shop_id && item.shop_post_id && (
                                    <Link
                                      href={`/shops/${order.shop_id}/posts/${item.shop_post_id}`}
                                      className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-700"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                      Xem trang sản phẩm
                                    </Link>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <p className="text-sm font-semibold text-yellow-800">Tệp tải xuống chưa khả dụng</p>
                              <p className="text-sm text-yellow-700 mt-1">
                                Tệp tải xuống và liên kết bên ngoài của bạn sẽ khả dụng khi đơn hàng được đánh dấu là <span className="font-semibold">Hoàn thành</span>.
                              </p>
                              <p className="text-xs text-yellow-600 mt-2">
                                Trạng thái hiện tại: <span className="font-medium">{getStatusLabel(order.status)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Không có sản phẩm trong đơn hàng này</p>
          )}
        </div>

        {/* Shipping Address */}
        {order.shipping_address && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Địa chỉ giao hàng</h3>
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
              <div className="bg-grey-200 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Địa chỉ thanh toán</h3>
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
        <div className="bg-grey-200 rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Tiến trình đơn hàng</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Đã đặt hàng</p>
                <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-gray-900 ${order.status !== 'pending' ? 'bg-blue-500' : 'bg-blue-300'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Đang xử lý</p>
                <p className="text-sm text-gray-600">{order.status !== 'pending' ? 'Đang thực hiện' : 'Chờ xử lý'}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-gray-900 ${order.status === 'completed' ? 'bg-blue-500' : 'bg-blue-300'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Đã giao hàng</p>
                <p className="text-sm text-gray-600">{order.status === 'completed' ? 'Đơn hàng hoàn thành' : 'Chờ giao hàng'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            href="/my-orders"
            className="flex-1 bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-3 px-6 rounded text-center transition-colors"
          >
            Quay lại danh sách đơn hàng
          </Link>
          {order.status === 'pending' && (
            <button className="flex-1 bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-3 px-6 rounded transition-colors">
              Hủy đơn hàng
            </button>
          )}
          {order.status === 'completed' && (
            <button className="flex-1 bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-3 px-6 rounded transition-colors">
              Trả hàng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
