'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { shops, Shop, ApiException } from '@/lib/api';

export default function AdminShopsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchPendingShops = async () => {
      if (!isAuthenticated || user?.role !== 'admin') return;

      try {
        setShopsLoading(true);
        const response = await shops.getPendingShops({ per_page: 50 });
        setPendingShops(response.data);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError('Không thể tải danh sách cửa hàng đang chờ');
        }
        console.error('Error fetching pending shops:', err);
      } finally {
        setShopsLoading(false);
      }
    };

    fetchPendingShops();
  }, [isAuthenticated, user]);

  const handleApprove = async (shopId: number, shopName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn duyệt cửa hàng "${shopName}"?`)) return;

    try {
      setActionLoading(shopId);
      await shops.approve(shopId);
      setPendingShops((prev) => prev.filter((shop) => shop.id !== shopId));
      alert('Đã duyệt cửa hàng thành công!');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(err.message);
      } else {
        alert('Không thể duyệt cửa hàng');
      }
      console.error('Error approving shop:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (shopId: number, shopName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn từ chối cửa hàng "${shopName}"?`)) return;

    try {
      setActionLoading(shopId);
      await shops.reject(shopId);
      setPendingShops((prev) => prev.filter((shop) => shop.id !== shopId));
      alert('Đã từ chối cửa hàng');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(err.message);
      } else {
        alert('Không thể từ chối cửa hàng');
      }
      console.error('Error rejecting shop:', err);
    } finally {
      setActionLoading(null);
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

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">Quản trị - Cửa hàng chờ duyệt</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Xem xét và duyệt đơn đăng ký cửa hàng</p>
          </div>
          <Link
            href="/shops"
            className="inline-flex items-center justify-center px-3 py-2 md:px-4 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors text-sm md:text-base"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden md:inline">Quay lại danh sách</span>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-grey-200 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Pending Shops List */}
        {pendingShops.length === 0 ? (
          <div className="bg-grey-200 rounded-lg shadow p-8 md:p-12 text-center">
            <svg className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Không có cửa hàng chờ duyệt</h3>
            <p className="text-sm md:text-base text-gray-600">Tất cả đơn đăng ký đã được xử lý.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {pendingShops.map((shop) => (
              <div key={shop.id} className="bg-grey-200 rounded-lg shadow-md border border-gray-300 overflow-hidden">
                {/* Shop Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 md:px-6 md:py-4">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate">{shop.name}</h3>
                  <p className="text-blue-100 text-xs md:text-sm mt-1">
                    Người gửi: {shop.owner?.name || 'Không rõ'}
                  </p>
                </div>

                {/* Shop Details */}
                <div className="p-4 md:p-6">
                  {shop.description && (
                    <div className="mb-3 md:mb-4">
                      <p className="text-sm md:text-base text-gray-700 line-clamp-3">{shop.description}</p>
                    </div>
                  )}

                  <div className="space-y-2 text-xs md:text-sm">
                    {shop.address && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-600">
                          {shop.address}
                          {shop.city && `, ${shop.city}`}
                          {shop.state && `, ${shop.state}`}
                          {shop.country && `, ${shop.country}`}
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
                        <span className="text-gray-600 truncate">{shop.email}</span>
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

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 md:mt-6 pt-4 border-t border-gray-300">
                    <button
                      onClick={() => handleApprove(shop.id, shop.name)}
                      disabled={actionLoading === shop.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {actionLoading === shop.id ? 'Đang xử lý...' : 'Duyệt'}
                    </button>
                    <button
                      onClick={() => handleReject(shop.id, shop.name)}
                      disabled={actionLoading === shop.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {actionLoading === shop.id ? 'Đang xử lý...' : 'Từ chối'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
