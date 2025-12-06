'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { shops, apiRequest, ApiException } from '@/lib/api';

interface ShopOrder {
  id: number;
  order_number: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  customer?: {
    id: number;
    display_name?: string;
    user_email?: string;
  };
  created_at: string;
  updated_at: string;
  items?: any[];
}

export default function ShopOrdersPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = parseInt(params.id as string);
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [shop, setShop] = useState<any>(null);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    async function fetchShopAndOrders() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch shop details
        const shopResponse = await shops.getById(shopId);

        // Log raw response for debugging
        console.log('[ShopOrders] Raw shop response:', shopResponse);

        // Handle both direct object and wrapped response
        let shopInfo = (shopResponse as any)?.data || shopResponse;

        // Sometimes the shop data might be nested deeper
        if (shopInfo?.shop) {
          shopInfo = shopInfo.shop;
        }

        console.log('[ShopOrders] Processed shop info:', {
          id: shopInfo?.id,
          name: shopInfo?.name,
          user_id: shopInfo?.user_id,
          owner_id: shopInfo?.owner?.id,
          ownerObject: shopInfo?.owner,
        });

        setShop(shopInfo);

        // Check if user owns this shop - shop owner should have user_id matching
        // Convert both to numbers for comparison to handle string/number type mismatches
        const shopOwnerId = parseInt(String(shopInfo?.user_id || shopInfo?.owner?.id || '0'), 10);
        const userId = parseInt(String(user?.id || '0'), 10);

        console.log('[ShopOrders] Permission check:', {
          shopOwnerId,
          userId,
          shopOwnerIdRaw: shopInfo?.user_id || shopInfo?.owner?.id,
          userIdRaw: user?.id,
          isAuthorized: shopOwnerId > 0 && shopOwnerId === userId,
          authenticatedUser: user ? { id: user.id, username: user.username, email: user.email } : 'NOT_AUTHENTICATED',
          shopOwner: { id: shopInfo?.user_id || shopInfo?.owner?.id, name: shopInfo?.owner?.name },
        });

        if (!shopOwnerId || shopOwnerId <= 0 || shopOwnerId !== userId) {
          console.warn('[ShopOrders] Permission denied - shop owner mismatch', {
            reason: !shopOwnerId ? 'No shop owner ID found' : shopOwnerId <= 0 ? 'Invalid shop owner ID' : `User ID mismatch: shop owner is ${shopOwnerId}, but authenticated user is ${userId}`,
            expectedOwnerId: shopOwnerId,
            actualUserId: userId,
          });
          setError('Bạn không có quyền xem đơn hàng của cửa hàng này');
          return;
        }

        // Fetch orders for this shop
        let orderUrl = `/orders?shop_id=${shopId}&per_page=100`;
        if (filterStatus) {
          orderUrl += `&status=${filterStatus}`;
        }
        const ordersData = await apiRequest<any>(orderUrl);
        setOrders(ordersData.data || ordersData);
      } catch (err) {
        let errorMsg = 'Failed to fetch shop orders';
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

    if (!authLoading && isAuthenticated && user && shopId) {
      fetchShopAndOrders();
    }
  }, [authLoading, isAuthenticated, user, shopId, filterStatus]);

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

  const handleSelectOrder = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.size === 0) {
      alert('Vui lòng chọn ít nhất một đơn hàng');
      return;
    }

    if (!confirm(`Cập nhật ${selectedOrders.size} đơn hàng sang trạng thái ${newStatus}?`)) {
      return;
    }

    try {
      setIsLoading(true);
      for (const orderId of selectedOrders) {
        await apiRequest(`/orders/${orderId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: newStatus }),
        });
      }

      // Refresh orders
      let orderUrl = `/orders?shop_id=${shopId}&per_page=100`;
      if (filterStatus) {
        orderUrl += `&status=${filterStatus}`;
      }
      const ordersData = await apiRequest<any>(orderUrl);
      setOrders(ordersData.data || ordersData);
      setSelectedOrders(new Set());
      alert('Đã cập nhật đơn hàng thành công');
    } catch (err) {
      alert('Không thể cập nhật đơn hàng');
      console.error('Update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
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
            <p className="text-gray-600">Đang tải đơn hàng...</p>
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
        <div className="max-w-7xl mx-auto px-4">
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
              href="/my-shops"
              className="inline-block bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors"
            >
              Quay lại cửa hàng của tôi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/my-shops" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại cửa hàng của tôi
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {shop?.name ? `${shop.name} - Đơn hàng` : 'Đơn hàng cửa hàng'}
          </h1>
          <p className="text-gray-600 mt-2">Quản lý và theo dõi tất cả đơn hàng của cửa hàng</p>
        </div>

        {/* Filters and Actions */}
        <div className="bg-grey-200 rounded-lg shadow-md p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            {/* Status Filter */}
            <div>
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-2">
                Lọc theo trạng thái
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả đơn hàng</option>
                <option value="pending">Chờ xử lý</option>
                <option value="processing">Đang xử lý</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedOrders.size > 0 && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Đã chọn {selectedOrders.size} đơn hàng
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('processing')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded transition-colors text-sm font-medium"
                  >
                    Đang xử lý
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('completed')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded transition-colors text-sm font-medium"
                  >
                    Hoàn thành
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('cancelled')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded transition-colors text-sm font-medium"
                  >
                    Đã hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders Table */}
        {orders.length === 0 ? (
          <div className="bg-grey-200 rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có đơn hàng</h3>
            <p className="text-gray-600">Cửa hàng của bạn chưa có đơn hàng nào.</p>
          </div>
        ) : (
          <div className="bg-grey-200 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã đơn hàng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Khách hàng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sản phẩm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-grey-200 divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-white">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{order.order_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{order.customer?.display_name || 'Khách hàng'}</div>
                        <div className="text-xs text-gray-500">{order.customer?.user_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{order.items?.length || 0} sản phẩm</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          ₫{(order.total_amount).toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/shops/${shopId}/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {orders.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-sm">Tổng đơn hàng</p>
              <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-sm">Chờ xử lý</p>
              <p className="text-3xl font-bold text-yellow-600">
                {orders.filter((o) => o.status === 'pending').length}
              </p>
            </div>
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-sm">Đang xử lý</p>
              <p className="text-3xl font-bold text-blue-600">
                {orders.filter((o) => o.status === 'processing').length}
              </p>
            </div>
            <div className="bg-grey-200 rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-sm">Hoàn thành</p>
              <p className="text-3xl font-bold text-green-600">
                {orders.filter((o) => o.status === 'completed').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
