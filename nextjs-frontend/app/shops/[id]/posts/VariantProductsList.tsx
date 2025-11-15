'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { shopPosts, type ShopPost } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';

interface VariantProductsListProps {
  shopId: number;
}

/**
 * Component to display and query products of type "Biến thể" (Variant Products)
 *
 * Features:
 * - Fetches all shop posts with product_type = "Biến thể"
 * - Displays variant products in a grid/list view
 * - Shows product attributes and options
 * - Real-time filtering and search
 */
export const VariantProductsList: React.FC<VariantProductsListProps> = ({ shopId }) => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<ShopPost[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ShopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('published');
  const [addedToCartId, setAddedToCartId] = useState<number | null>(null);

  useEffect(() => {
    fetchVariantProducts();
  }, [shopId]);

  // Filter products when search or status changes
  useEffect(() => {
    let filtered = products;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((product) => product.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) =>
        product.title.toLowerCase().includes(query) ||
        product.content?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, statusFilter]);

  const fetchVariantProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all posts from the shop
      const response = await shopPosts.getAll(shopId, {
        per_page: 100,
      });

      const allPosts = response.data || [];

      // Filter for variant products (product_type === "Biến thể")
      // Check the product_type field directly - now properly typed in ShopPost interface
      // Include only products with attributes defined
      const variantProducts = allPosts.filter((post) => {
        // Exact match: product_type === "Biến thể" and has attributes
        return post.product_type === 'Biến thể' && post.attributes;
      });

      setProducts(variantProducts);
    } catch (err) {
      console.error('Error fetching variant products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load variant products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: ShopPost) => {
    const price = parseFloat((product as any).price) || 0;
    const image = (product as any).main_image || product.featured_images?.[0] || '/placeholder.png';

    addToCart({
      id: Math.random(),
      postId: product.id,
      shopId,
      title: product.title,
      price,
      image,
      product_type: product.product_type || 'unknown',
      type: product.type,
    });

    setAddedToCartId(product.id);
    setTimeout(() => setAddedToCartId(null), 2000);
  };

  if (loading) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
        <p className="text-purple-900">Loading variant products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <p className="text-red-900 font-medium">Error loading variant products</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <button
          onClick={fetchVariantProducts}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2 mb-4">
          🎨 Variant Products (Biến thể)
        </h3>
        <p className="text-sm text-gray-600">
          Browse and filter products with attributes like Size, Color, and Material.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-4 border border-purple-300 space-y-3">
        <input
          type="text"
          placeholder="Search variant products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
        />

        <div>
          <label className="text-sm font-medium text-gray-700 mr-3">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Products Count */}
      <div className="bg-purple-100 border border-purple-300 rounded p-3">
        <p className="text-sm text-purple-900">
          📊 Found {filteredProducts.length} variant product{filteredProducts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-purple-300">
          <p className="text-gray-500 text-lg">
            {products.length === 0 ? 'No variant products yet' : 'No products match your filters'}
          </p>
          {products.length > 0 && searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg border border-purple-300 p-4 hover:shadow-lg transition-shadow"
            >
              {/* Product Image - Priority: main_image > featured_images[0] */}
              {((product as any).main_image || (product.featured_images && product.featured_images.length > 0)) && (
                <img
                  src={(product as any).main_image || (product.featured_images && product.featured_images[0])}
                  alt={product.title}
                  className="w-full h-40 object-cover rounded-md mb-3"
                />
              )}

              {/* Product Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 line-clamp-2">{product.title}</h4>

                {product.short_description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{product.short_description}</p>
                )}
                {!product.short_description && product.detail_description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{product.detail_description}</p>
                )}
                {!product.short_description && !product.detail_description && product.content && (
                  <p className="text-sm text-gray-600 line-clamp-2">{product.content}</p>
                )}

                {/* Status Badge */}
                <div className="flex gap-2 mt-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      product.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {product.status}
                  </span>

                  {/* Type Badge */}
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                    {product.type}
                  </span>
                </div>

                {/* Meta Info */}
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 mb-3">
                  <p>Views: {product.view_count}</p>
                  <p>Created: {new Date(product.created_at).toLocaleDateString()}</p>
                  {product.author && <p>By: {product.author.name || product.author.username}</p>}
                </div>

                {/* Buttons Container */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className={`block w-full px-4 py-2 rounded-md font-medium text-center transition-colors ${
                      addedToCartId === product.id
                        ? 'bg-green-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {addedToCartId === product.id ? '✓ Added to Cart' : 'Add to Cart'}
                  </button>
                  <Link
                    href={`/shops/${shopId}/posts/${product.id}`}
                    className="block w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium text-center transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
