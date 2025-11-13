'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { shops, Shop, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ShopsPage() {
  const [shopsList, setShopsList] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchShops();
  }, [isAuthenticated]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all active shops
      const response = await shops.getAll({ per_page: 50 });
      let allShops = response.data;

      // If authenticated, also fetch user's own shops (including pending)
      if (isAuthenticated) {
        const myShopsResponse = await shops.myShops({ per_page: 50 });
        const myShops = myShopsResponse.data;

        // Merge shops, removing duplicates
        const shopIds = new Set(allShops.map(s => s.id));
        const uniqueMyShops = myShops.filter(s => !shopIds.has(s.id));
        allShops = [...allShops, ...uniqueMyShops];
      }

      setShopsList(allShops);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to fetch shops');
      }
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shopId: number, shopName: string) => {
    if (!confirm(`Are you sure you want to delete "${shopName}"?`)) {
      return;
    }

    try {
      await shops.delete(shopId);
      setShopsList((prev) => prev.filter((shop) => shop.id !== shopId));
      alert('Shop deleted successfully!');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Failed to delete shop: ${err.message}`);
      } else {
        alert('Failed to delete shop');
      }
      console.error('Delete error:', err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Shops</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Shops</h1>
          <div className="flex gap-3">
            {user?.role === 'admin' && (
              <Link
                href="/admin/shops"
                className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Admin Panel
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/shops/create"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Shop
              </Link>
            )}
          </div>
        </div>

        {/* Pending Shop Notification */}
        {user && shopsList.some((shop) => shop.user_id === user.id && shop.status === 'pending') && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Shop Pending Approval</h3>
                <p className="text-yellow-800 text-sm">
                  You have one or more shops waiting for admin approval. They will appear in the public listing once approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shops Grid */}
        {shopsList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-lg text-gray-600 mb-2">No shops available yet</p>
            <p className="text-sm text-gray-500">Be the first to create a shop!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shopsList.map((shop) => (
              <div
                key={shop.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
              >
                {/* Shop Banner/Cover Image */}
                {shop.banner ? (
                  <div className="relative h-40 bg-gray-200 overflow-hidden">
                    <img src={shop.banner} alt="Shop banner" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                )}

                {/* Shop Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 flex gap-3">
                      {/* Shop Logo/Avatar */}
                      {shop.logo && (
                        <div className="flex-shrink-0">
                          <img
                            src={shop.logo}
                            alt={shop.name}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          <Link href={`/shops/${shop.id}`} className="hover:text-blue-600 transition-colors">
                            {shop.name}
                          </Link>
                        </h3>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            shop.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : shop.status === 'inactive'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {shop.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {shop.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{shop.description}</p>
                  )}

                  {/* Address */}
                  {shop.address && (
                    <div className="flex items-start text-sm text-gray-500 mb-3">
                      <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <span>{shop.address}</span>
                    </div>
                  )}

                  {/* Location */}
                  {(shop.city || shop.state || shop.country) && (
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {[shop.city, shop.state, shop.country].filter(Boolean).join(', ')}
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-1 mb-4">
                    {shop.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <a
                          href={`tel:${shop.phone}`}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {shop.phone}
                        </a>
                      </div>
                    )}
                    {shop.email && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <a
                          href={`mailto:${shop.email}`}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {shop.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {user && shop.user_id === user.id && (
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <Link
                        href={`/shops/${shop.id}/edit`}
                        className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(shop.id, shop.name)}
                        className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
