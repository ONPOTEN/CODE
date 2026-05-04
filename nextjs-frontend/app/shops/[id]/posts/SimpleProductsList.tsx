'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { shopPosts, type ShopPost } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';

interface SimpleProductsListProps {
  shopId: number;
  externalSearch?: string;
  hideSearch?: boolean;
}

/**
 * Component to display and query products of type "Đơn giản" (Simple Products)
 *
 * Features:
 * - Fetches all shop posts with product_type = "Đơn giản"
 * - Displays products with pricing, descriptions, and categories
 * - Real-time filtering and search
 */
export const SimpleProductsList: React.FC<SimpleProductsListProps> = ({ 
  shopId, 
  externalSearch = '', 
  hideSearch = false 
}) => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<ShopPost[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ShopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('published');
  const [addedToCartId, setAddedToCartId] = useState<number | null>(null);

  useEffect(() => {
    fetchSimpleProducts();
  }, [shopId]);

  // Filter products when search or status changes
  useEffect(() => {
    let filtered = products;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((product) => product.status === statusFilter);
    }

    // Filter by internal search query or external search
    const effectiveSearch = externalSearch || searchQuery;
    if (effectiveSearch.trim()) {
      const query = effectiveSearch.toLowerCase();
      filtered = filtered.filter((product) =>
        product.title.toLowerCase().includes(query) ||
        product.content?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, statusFilter, externalSearch]);

  const fetchSimpleProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all posts from the shop
      const response = await shopPosts.getAll(shopId, {
        per_page: 100,
      });

      const allPosts = response.data || [];

      // Filter for simple products (product_type === "Đơn giản")
      // Check the product_type field directly - now properly typed in ShopPost interface
      const simpleProducts = allPosts.filter((post) => {
        // Exact match: product_type === "Đơn giản"
        return post.product_type === 'Đơn giản';
      });

      setProducts(simpleProducts);
    } catch (err) {
      console.error('Error fetching simple products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load simple products');
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
      <div className="bg-grey-200 border border-blue-200 rounded-lg p-8 text-center">
        <p className="text-blue-900">Đang tải sản phẩm đơn giản...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-grey-200 border border-red-200 rounded-lg p-8 text-center">
        <p className="text-red-900 font-medium">Lỗi khi tải sản phẩm đơn giản</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <button
          onClick={fetchSimpleProducts}
          className="mt-4 px-4 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="bg-grey-200 border border-blue-200 rounded-lg p-6 space-y-6">

      {/* Search and Filters - Hidden when hideSearch is true */}
      {!hideSearch && (
        <div className="bg-grey-200 rounded-lg p-4 border border-blue-300 space-y-3">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm đơn giản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />

          <div>
            <label className="text-sm font-medium text-gray-700 mr-3">Trạng thái:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
            </select>
          </div>
        </div>
      )}

      {/* Products Count */}

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-grey-200 rounded-lg p-8 text-center border border-blue-300">
          <p className="text-gray-500 text-lg">
            {products.length === 0 ? 'Chưa có sản phẩm đơn giản' : 'Không có sản phẩm phù hợp với bộ lọc'}
          </p>
          {products.length > 0 && searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-grey-200 rounded-lg border border-blue-300 p-4 hover:shadow-lg transition-shadow"
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
                {!product.short_description && product.content && (
                  <p className="text-sm text-gray-600 line-clamp-2">{product.content}</p>
                )}

                {/* Pricing Display */}
                <div className="flex items-center gap-2">
                  {(product as any).price && (
                    <>
                      <span className="text-sm font-bold text-blue-600">
                        ${parseFloat((product as any).price).toFixed(2)}
                      </span>
                      {(product as any).sale_price && (
                        <span className="text-sm line-through text-gray-500">
                          ${parseFloat((product as any).sale_price).toFixed(2)}
                        </span>
                      )}
                    </>
                  )}
                  {!((product as any).price) && (product as any).price_range && (
                    <p className="text-sm font-medium text-blue-600">{(product as any).price_range}</p>
                  )}
                </div>

                {/* Status Badge */}


                {/* Buttons Container */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className={`block w-full px-4 py-2 rounded-md font-medium text-center transition-colors ${
                      addedToCartId === product.id
                        ? 'bg-blue-500 text-gray-900'
                        : 'bg-grey-2000 hover:bg-blue-500 text-gray-900'
                    }`}
                  >
                    {addedToCartId === product.id ? '✓ Đã thêm vào giỏ' : 'Thêm vào giỏ'}
                  </button>
                  <Link
                    href={`/shops/${shopId}/posts/${product.id}`}
                    className="block w-full px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-md font-medium text-center transition-colors"
                  >
                    Xem chi tiết
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
