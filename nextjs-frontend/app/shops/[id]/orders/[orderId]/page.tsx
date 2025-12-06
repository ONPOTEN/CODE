'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { orders, shops, shopPosts, ApiException } from '@/lib/api';

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
  product?: any;
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
        let shopInfo = await shops.getById(shopId);

        // Log raw response for debugging
        console.log('[ShopOrderDetail] Raw shop response:', shopInfo);

        // Handle both direct object and wrapped response
        if ((shopInfo as any)?.data) {
          shopInfo = (shopInfo as any).data;
        }
        if ((shopInfo as any)?.shop) {
          shopInfo = (shopInfo as any).shop;
        }

        console.log('[ShopOrderDetail] Processed shop info:', {
          id: (shopInfo as any)?.id,
          name: (shopInfo as any)?.name,
          user_id: (shopInfo as any)?.user_id,
          owner_id: (shopInfo as any)?.owner?.id,
          ownerObject: (shopInfo as any)?.owner,
        });

        // Check if user owns this shop - shop owner should have user_id matching
        // Convert both to numbers for comparison to handle string/number type mismatches
        const shopOwnerId = parseInt(String((shopInfo as any)?.user_id || (shopInfo as any)?.owner?.id || '0'), 10);
        const userId = parseInt(String(user?.id || '0'), 10);

        console.log('[ShopOrderDetail] Permission check:', {
          shopOwnerId,
          userId,
          shopOwnerIdRaw: (shopInfo as any)?.user_id || (shopInfo as any)?.owner?.id,
          userIdRaw: user?.id,
          isAuthorized: shopOwnerId > 0 && shopOwnerId === userId,
          authenticatedUser: user ? { id: user.id, username: user.username, email: user.email } : 'NOT_AUTHENTICATED',
          shopOwner: { id: (shopInfo as any)?.user_id || (shopInfo as any)?.owner?.id, name: (shopInfo as any)?.owner?.name },
        });

        if (!shopOwnerId || shopOwnerId <= 0 || shopOwnerId !== userId) {
          console.warn('[ShopOrderDetail] Permission denied - shop owner mismatch', {
            reason: !shopOwnerId ? 'No shop owner ID found' : shopOwnerId <= 0 ? 'Invalid shop owner ID' : `User ID mismatch: shop owner is ${shopOwnerId}, but authenticated user is ${userId}`,
            expectedOwnerId: shopOwnerId,
            actualUserId: userId,
          });
          setError('Bạn không có quyền xem đơn hàng của cửa hàng này');
          return;
        }

        setShop(shopInfo);

        // Fetch order details from shop orders endpoint
        // Use the myOrders endpoint with shop_id filter to get shop-specific orders
        console.log('[ShopOrderDetail] Fetching order', orderId, 'for shop', shopId);
        const ordersResponse = await orders.myOrders({ shop_id: shopId, per_page: 100 });
        console.log('[ShopOrderDetail] Orders response:', ordersResponse);

        const allOrders = ordersResponse.data || ordersResponse;
        const orderDetail = Array.isArray(allOrders)
          ? allOrders.find((o: any) => o.id === orderId)
          : null;

        if (!orderDetail) {
          console.error('[ShopOrderDetail] Order not found in shop orders list');
          setError('Không tìm thấy đơn hàng trong cửa hàng của bạn');
          return;
        }

        console.log('[ShopOrderDetail] Found order:', orderDetail);

        // Verify order belongs to this shop
        if (orderDetail.shop_id !== shopId) {
          setError('Đơn hàng này không thuộc về cửa hàng của bạn');
          return;
        }

        // For completed orders with download products, ALWAYS fetch product details to get download_files and link_files
        if (orderDetail.status === 'completed' && orderDetail.items) {
          const downloadItems = orderDetail.items.filter(
            (item: OrderItem) => item.product_type === 'Tải xuống'
          );

          // Fetch product details for ALL download items to ensure we have the latest files
          for (const item of downloadItems) {
            // Always try to fetch product details for download products
            if (item.shop_post_id) {
              try {
                const productResponse = await shopPosts.getById(shopId, item.shop_post_id);
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
      setUpdateMessage('Đã cập nhật trạng thái đơn hàng thành công');

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

  const getProductTypeColor = (type: string) => {
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

  if (error) {
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lỗi</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href={`/shops/${shopId}/orders`}
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Quay lại đơn hàng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-grey-200 rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy đơn hàng</h3>
            <p className="text-gray-600 mb-6">Không tìm thấy đơn hàng bạn đang tìm kiếm.</p>
            <Link
              href={`/shops/${shopId}/orders`}
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Quay lại đơn hàng
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
          <Link
            href={`/shops/${shopId}/orders`}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại đơn hàng
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-gray-600 mt-2">
            Ngày đặt hàng: {new Date(order.created_at).toLocaleDateString('vi-VN')}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Update Section */}
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Trạng thái đơn hàng</h2>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
                <button
                  onClick={handleStatusUpdate}
                  disabled={statusLoading || selectedStatus === order.status}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-700 disabled:bg-blue-400 text-gray-900 rounded-md font-medium transition-colors"
                >
                  {statusLoading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
              {updateMessage && (
                <div className={`mt-4 p-3 rounded ${updateMessage.includes('success') ? 'bg-blue-500 text-green-800' : 'bg-blue-500 text-red-800'}`}>
                  {updateMessage}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Sản phẩm trong đơn</h2>
              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={item.id} className="border border-gray-300 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">Số lượng: {item.quantity}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProductTypeColor(item.product_type)}`}>
                          {item.product_type}
                        </span>
                      </div>

                      {/* Variant Options */}
                      {item.product_type === 'Biến thể' && item.variant_options && Object.keys(item.variant_options).length > 0 && (
                        <div className="mb-3 p-3 bg-white rounded">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Tùy chọn đã chọn:</p>
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
                          {order.status === 'completed' ? (
                            <>
                              {/* Downloadable Files - New Design */}
                              {item.download_files && (Array.isArray(item.download_files) ? item.download_files.length > 0 : (typeof item.download_files === 'object' ? Object.keys(item.download_files).length > 0 : !!item.download_files)) && (
                                <div className="border border-green-300 rounded-lg p-4 bg-grey-200">
                                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm">
                                    <span>📁</span> Tệp tải xuống
                                  </h4>
                                  <div className="space-y-2">
                                    {(Array.isArray(item.download_files) ? item.download_files : [item.download_files]).map((file: any, idx: number) => {
                                      const fileName = typeof file === 'string' ? file.split('/').pop() : file.name || `File ${idx + 1}`;
                                      const fileSize = file.size ? `${(file.size / 1024).toFixed(2)} KB` : null;
                                      const fileUrl = typeof file === 'string' ? file : file.url || file;

                                      return (
                                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-green-200">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                            </svg>
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                                              {fileSize && <p className="text-xs text-gray-500">{fileSize}</p>}
                                            </div>
                                          </div>
                                          <a
                                            href={fileUrl}
                                            download
                                            className="ml-2 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors flex-shrink-0"
                                          >
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
                                <div className="border border-blue-300 rounded-lg p-4 bg-grey-200 mt-2">
                                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm">
                                    <span>🔗</span> Liên kết ngoài
                                  </h4>
                                  <div className="space-y-2">
                                    {item.link_files.map((link: any, idx: number) => {
                                      const linkTitle = link.title || link.label || `Link ${idx + 1}`;
                                      const linkUrl = link.url || link;

                                      return (
                                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">{linkTitle}</p>
                                              <p className="text-xs text-gray-500 truncate">{linkUrl}</p>
                                            </div>
                                          </div>
                                          <a
                                            href={linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors flex-shrink-0"
                                          >
                                            Mở
                                          </a>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {/* No downloads available message */}
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
                                    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                                      <p className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                                        <span>ℹ️</span>
                                        Chưa có tệp tải xuống cho sản phẩm này.
                                      </p>
                                      {item.shop_post_id && (
                                        <Link
                                          href={`/shops/${shopId}/posts/${item.shop_post_id}/edit`}
                                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          Sửa sản phẩm để thêm tệp
                                        </Link>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          ) : (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Tải xuống sẽ khả dụng sau khi đơn hàng hoàn thành.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="border-t border-gray-300 pt-3 text-right">
                        <p className="text-sm text-gray-600">
                          ₫{(item.unit_price).toLocaleString('vi-VN')} × {item.quantity} = <span className="font-semibold text-gray-900">₫{(item.subtotal).toLocaleString('vi-VN')}</span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Không có sản phẩm trong đơn hàng này</p>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="bg-grey-200 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Địa chỉ giao hàng</h2>
                <div className="space-y-2 text-gray-700">
                  <p className="font-semibold">{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </p>
                  <p className="text-sm">Điện thoại: {order.shipping_address.phone}</p>
                  <p className="text-sm">Email: {order.shipping_address.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Info */}
            {order.customer && (
              <div className="bg-grey-200 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Khách hàng</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Tên</p>
                    <p className="font-semibold text-gray-900">{order.customer.display_name || order.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    <p className="text-gray-700">{order.customer.user_email || order.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Mã người dùng</p>
                    <p className="text-gray-700">#{order.customer.id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tổng kết đơn hàng</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tạm tính:</span>
                  <span className="text-gray-900">₫{(order.subtotal).toLocaleString('vi-VN')}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Thuế:</span>
                    <span className="text-gray-900">₫{(order.tax).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                {order.shipping_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phí vận chuyển:</span>
                    <span className="text-gray-900">₫{(order.shipping_fee).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Giảm giá:</span>
                    <span className="text-red-600">-₫{(order.discount).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">Tổng cộng:</span>
                  <span className="font-bold text-lg text-blue-600">₫{(order.total_amount).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Lịch sử</h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-gray-900 flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Đã đặt hàng</p>
                    <p className="text-gray-600">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>

                {order.status !== 'pending' && (
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-900 flex-shrink-0 ${
                      ['processing', 'completed'].includes(order.status) ? 'bg-blue-500' : 'bg-blue-300'
                    }`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Đang xử lý</p>
                      <p className="text-gray-600">{new Date(order.updated_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                )}

                {order.status === 'completed' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-gray-900 flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Đã giao hàng</p>
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
