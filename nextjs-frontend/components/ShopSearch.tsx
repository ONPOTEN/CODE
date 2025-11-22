'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { shops as shopsApi, Shop } from '@/lib/api';
import { ShopCard } from '@/components/ShopCard';

export function ShopSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (term: string) => {
      setSearchTerm(term);

      if (!term.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setHasSearched(true);

        const response = await shopsApi.getAll({
          search: term,
          per_page: 6,
          status: 'active',
        });

        setResults(response.data);
      } catch (err) {
        console.error('Error searching shops:', err);
        setError('Failed to search shops');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleSearch(value);
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setHasSearched(false);
    setError(null);
  };

  return (
    <section className="container py-12 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Find Shops</h2>
          <p className="text-gray-600">Search for shops and businesses near you</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <div className="flex items-center bg-white rounded-lg border border-gray-300 overflow-hidden hover:border-blue-300 transition-colors">
              <svg
                className="w-5 h-5 text-gray-600 ml-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search shops by name, category, location..."
                value={searchTerm}
                onChange={handleInputChange}
                className="flex-1 px-4 py-3 bg-transparent outline-none text-gray-900 placeholder-gray-500"
              />
              {searchTerm && (
                <button
                  onClick={handleClear}
                  className="pr-4 text-gray-600 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Search Info */}
          {hasSearched && searchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Searching shops...
                </span>
              ) : error ? (
                <span className="text-red-600">{error}</span>
              ) : results.length === 0 ? (
                <span>No shops found matching "{searchTerm}"</span>
              ) : (
                <span>{results.length} shop{results.length !== 1 ? 's' : ''} found</span>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {hasSearched && searchTerm && (
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p className="text-gray-500 mb-4">No shops found matching your search</p>
                <Link
                  href="/shops"
                  className="inline-block px-6 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Browse All Shops
                </Link>
              </div>
            ) : (
              <>
                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {results.map((shop) => (
                    <ShopCard key={shop.id} shop={shop} />
                  ))}
                </div>

                {/* View All Button */}
                <div className="text-center">
                  <Link
                    href={`/shops?search=${encodeURIComponent(searchTerm)}`}
                    className="inline-block px-6 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    View All Results
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* No Search Yet - Show CTA */}
        {!hasSearched && (
          <div className="rounded-lg p-8 text-center border border-blue-100">
            <p className="text-gray-600 mb-4">
              Search for shops above or explore all available businesses
            </p>
            <Link
              href="/shops"
              className="inline-block px-6 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Explore All Shops
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default ShopSearch;
