'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { shops, Shop, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Menu from '@/components/Menu';

export default function ShopsPage() {
  const [shopsList, setShopsList] = useState<Shop[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (secondsAgo < 60) return 'just now';
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
    if (secondsAgo < 2592000) return `${Math.floor(secondsAgo / 604800)}w ago`;
    return `${Math.floor(secondsAgo / 2592000)}mo ago`;
  };

  const fetchShops = useCallback(async (pageNum: number, search?: string) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all active shops with pagination and search
      const response = await shops.getAll({
        per_page: 10,
        page: pageNum,
        search: search || undefined
      });

      let newShops = response.data;

      // If authenticated and first page and not searching, also fetch user's own shops (including pending)
      if (isAuthenticated && pageNum === 1 && !search) {
        try {
          const myShopsResponse = await shops.myShops({ per_page: 50 });
          const myShops = myShopsResponse.data;

          // Merge shops, removing duplicates
          const shopIds = new Set(newShops.map(s => s.id));
          const uniqueMyShops = myShops.filter(s => !shopIds.has(s.id));
          newShops = [...uniqueMyShops, ...newShops];
        } catch (e) {
          // Ignore error for my shops
        }
      }

      if (newShops.length === 0 && pageNum > 1) {
        setHasMore(false);
      } else {
        setShopsList((prev) => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(s => s.id));
          const filteredNew = newShops.filter(s => !existingIds.has(s.id));
          return pageNum === 1 ? newShops : [...prev, ...filteredNew];
        });

        // Check if there are more pages
        if (response.meta) {
          setHasMore(pageNum < response.meta.last_page);
        } else if (newShops.length < 10) {
          setHasMore(false);
        }
      }
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
  }, [loading, isAuthenticated]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null && menuRefs.current[openMenuId]) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const toggleMenu = (shopId: number) => {
    setOpenMenuId(openMenuId === shopId ? null : shopId);
  };

  const handleEditShop = (shopId: number) => {
    setOpenMenuId(null);
    router.push(`/shops/${shopId}/edit`);
  };

  const handleDelete = async (shopId: number, shopName: string) => {
    if (!confirm(`Are you sure you want to delete "${shopName}"?`)) {
      return;
    }

    try {
      await shops.delete(shopId);
      setShopsList((prev) => prev.filter((shop) => shop.id !== shopId));
      setOpenMenuId(null);
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

  // Handle search input with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
      setShopsList([]);
      setHasMore(true);
    }, 300);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    setShopsList([]);
    setHasMore(true);
  };

  useEffect(() => {
    fetchShops(1, searchQuery);
  }, [isAuthenticated, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchShops(nextPage, searchQuery);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, fetchShops]);

  if (error && shopsList.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="hidden lg:block">
          <Menu />
        </div>
        <section className="w-full px-2 md:px-4 py-6 md:py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 max-w-4xl mx-auto">
            <h3 className="text-base md:text-lg font-semibold text-red-900 mb-2">Error Loading Shops</h3>
            <p className="text-sm md:text-base text-red-700">{error}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Welcome Section - Desktop Only */}
      <div className="hidden lg:block">
        <Menu />
      </div>

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search shops by name, description, location..."
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Searching for: <span className="font-medium">"{searchQuery}"</span>
            {!loading && ` - ${shopsList.length} result${shopsList.length !== 1 ? 's' : ''} found`}
          </p>
        )}
      </div>

      {/* Create Shop Button - Below Menu */}
      {isAuthenticated && (
        <div className="lg:block max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/shops/create"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Shop</span>
          </Link>
        </div>
      )}

      {/* Admin Panel Button */}
      {user?.role === 'admin' && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <Link
            href="/admin/shops"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Admin Panel</span>
          </Link>
        </div>
      )}

      {/* Pending Shop Notification */}
      {user && shopsList.some((shop) => shop.user_id === user.id && shop.status === 'pending') && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
        </div>
      )}

      {/* Shops Feed Section */}
      <section className="w-full px-2 md:px-4 py-6 md:py-12 bg-white">
        <div className="w-full max-w-4xl mx-auto">
          {shopsList.length === 0 && !loading ? (
            <div className="text-center text-gray-600 py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {searchQuery ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                )}
              </svg>
              {searchQuery ? (
                <>
                  <p className="text-lg">No shops found for "{searchQuery}"</p>
                  <p className="text-sm mt-2">Try a different search term</p>
                  <button
                    onClick={handleClearSearch}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-lg">No shops available yet.</p>
                  <p className="text-sm mt-2">Be the first to create a shop!</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {shopsList.map((shop) => (
                <article
                  key={shop.id}
                  className="w-full border-b border-gray-200 pb-4 pt-6 flex gap-2 md:gap-3 overflow-hidden"
                >
                  {/* Shop Logo/Avatar */}
                  <div className="flex-shrink-0">
                    <Link href={`/shops/${shop.id}`}>
                      {shop.logo ? (
                        <img
                          src={shop.logo}
                          alt={shop.name}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                          <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                    </Link>
                  </div>

                  {/* Right Area */}
                  <div className="flex-1 min-w-0 w-full">
                    {/* Top row: Name + status + menu */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/shops/${shop.id}`} className="font-semibold text-gray-900 text-sm md:text-base line-clamp-1 hover:text-blue-600">
                            {shop.name}
                          </Link>
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
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
                        <span className="text-xs md:text-sm text-gray-500">
                          {shop.created_at ? getRelativeTime(shop.created_at) : ''}
                        </span>
                      </div>

                      {/* Menu Button - Only for shop owner */}
                      {user && shop.user_id === user.id && (
                        <div className="relative flex-shrink-0" ref={(el) => { menuRefs.current[shop.id] = el; }}>
                          <button
                            onClick={() => toggleMenu(shop.id)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="6" r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="18" r="1.5" />
                            </svg>
                          </button>

                          {openMenuId === shop.id && (
                            <div className="absolute right-0 mt-2 w-32 md:w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                              <button
                                onClick={() => handleEditShop(shop.id)}
                                className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(shop.id, shop.name)}
                                className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {shop.description && (
                      <Link href={`/shops/${shop.id}`}>
                        <p className="mt-2 text-base md:text-lg text-gray-800 whitespace-pre-line break-words hover:text-blue-600 cursor-pointer transition-colors line-clamp-3">
                          {shop.description}
                        </p>
                      </Link>
                    )}

                    {/* Shop Banner Image */}
                    {shop.banner && (
                      <Link href={`/shops/${shop.id}`} className="block mt-3">
                        <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden">
                          <img
                            src={shop.banner}
                            alt={`${shop.name} banner`}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                          />
                        </div>
                      </Link>
                    )}

                    {/* Shop Info */}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                      {/* Location */}
                      {(shop.city || shop.state || shop.country) && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{[shop.city, shop.state, shop.country].filter(Boolean).join(', ')}</span>
                        </div>
                      )}

                      {/* Phone */}
                      {shop.phone && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          <a href={`tel:${shop.phone}`} className="hover:text-blue-600">
                            {shop.phone}
                          </a>
                        </div>
                      )}

                      {/* Email */}
                      {shop.email && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <a href={`mailto:${shop.email}`} className="hover:text-blue-600">
                            {shop.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* View Shop Button */}
                    <div className="mt-4">
                      <Link
                        href={`/shops/${shop.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View Shop
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Observer target for infinite scroll */}
          {hasMore && !loading && <div ref={observerTarget} className="h-10" />}

          {/* No more shops message */}
          {!hasMore && shopsList.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">You've reached the end of the shops</p>
            </div>
          )}

          {/* Error message while scrolling */}
          {error && shopsList.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
