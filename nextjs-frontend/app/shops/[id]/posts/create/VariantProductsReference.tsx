'use client';

import React, { useEffect, useState } from 'react';
import { shopPosts, type ShopPost } from '@/lib/api';

interface VariantProductsReferenceProps {
  shopId: number;
}

/**
 * Component to display existing variant products as reference
 * Renders in the create form page to help users see examples
 *
 * Features:
 * - Fetches and queries products of type "Biến thể" (Variant Products)
 * - Displays them as reference/examples while creating new products
 * - Shows product structure with attributes
 * - Collapsible for compact view
 */
export const VariantProductsReference: React.FC<VariantProductsReferenceProps> = ({ shopId }) => {
  const [products, setProducts] = useState<ShopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchVariantProducts();
  }, [shopId]);

  const fetchVariantProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all posts from the shop
      const response = await shopPosts.getAll(shopId, {
        per_page: 100,
      });

      const allPosts = response.data || [];

      // Query: Filter for variant products (product_type === "Biến thể")
      // Exact match - properly typed in ShopPost interface
      // Include only products with attributes defined
      const variantProducts = allPosts.filter((post) => {
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

  // Don't render if no products or loading
  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
        <p className="text-red-900 text-sm">Error loading variant product examples</p>
      </div>
    );
  }

  // Don't show if no variant products exist
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mt-8">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:bg-purple-100 px-2 py-1 rounded transition-colors"
      >
        <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
          🎨 Variant Product Examples
          <span className="text-sm font-normal text-purple-700">({products.length})</span>
        </h3>
        <svg
          className={`w-5 h-5 text-purple-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      <p className="text-sm text-gray-600 mt-2 mb-4">
        Reference examples of variant products in this shop. Use these as a guide for creating new variant products.
      </p>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="space-y-4 mt-4 border-t border-purple-200 pt-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-purple-300 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Product Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{product.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">ID: {product.id}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  Variant
                </span>
              </div>

              {/* Description */}
              {product.short_description && (
                <p className="text-sm text-gray-600 mb-3">{product.short_description.substring(0, 100)}...</p>
              )}
              {!product.short_description && product.detail_description && (
                <p className="text-sm text-gray-600 mb-3">{product.detail_description.substring(0, 100)}...</p>
              )}
              {!product.short_description && !product.detail_description && product.content && (
                <p className="text-sm text-gray-600 mb-3">{product.content.substring(0, 100)}...</p>
              )}

              {/* Attributes Display */}
              {product.attributes && product.attributes.length > 0 && (
                <div className="bg-purple-50 rounded p-3 mb-3">
                  <p className="text-xs font-medium text-purple-900 mb-2">📋 Attributes:</p>
                  <div className="space-y-2">
                    {product.attributes.map((attr: any, idx: number) => (
                      <div key={idx} className="text-xs">
                        <p className="font-medium text-gray-800">{attr.name}:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {attr.options && attr.options.length > 0 ? (
                            attr.options.map((opt: any, optIdx: number) => (
                              <span
                                key={optIdx}
                                className="inline-block px-2 py-1 bg-purple-200 text-purple-900 rounded text-xs"
                              >
                                {opt.value}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 italic">No options</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 border-t border-purple-200 pt-3">
                <div>
                  <p className="text-gray-500">Status:</p>
                  <p className="font-medium text-gray-900">{product.status}</p>
                </div>
                <div>
                  <p className="text-gray-500">Views:</p>
                  <p className="font-medium text-gray-900">{product.view_count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact View - Summary */}
      {!isExpanded && (
        <div className="flex flex-wrap gap-2 mt-3">
          {products.slice(0, 3).map((product) => (
            <div
              key={product.id}
              className="inline-flex items-center gap-2 bg-white border border-purple-300 rounded px-3 py-1 text-xs"
            >
              <span className="font-medium text-gray-900">{product.title}</span>
              {product.attributes && (
                <span className="text-purple-600">
                  {product.attributes.length} attr{product.attributes.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          ))}
          {products.length > 3 && (
            <div className="inline-flex items-center gap-2 bg-white border border-purple-300 rounded px-3 py-1 text-xs text-gray-600">
              +{products.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};
