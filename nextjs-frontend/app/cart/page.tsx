'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

export default function CartPage() {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPrice = getTotalPrice();
  const itemCount = items.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          // Empty Cart
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products to get started!</p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Start Shopping
            </Link>
          </div>
        ) : (
          // Cart with Items
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6 flex gap-4">
                  {/* Product Image */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">
                      Type: <span className="font-medium">{item.product_type}</span>
                    </p>
                    <p className="text-lg font-bold text-green-600 mt-2">
                      ${item.price.toFixed(2)}
                    </p>

                    {/* Quantity Control */}
                    <div className="flex items-center gap-3 mt-4">
                      <label className="text-sm font-medium text-gray-700">Qty:</label>
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.postId,
                              item.shopId,
                              Math.max(1, item.quantity - 1),
                              item.attributes
                            )
                          }
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          −
                        </button>
                        <span className="px-4 py-1 border-l border-r border-gray-300 min-w-[40px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.postId,
                              item.shopId,
                              item.quantity + 1,
                              item.attributes
                            )
                          }
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm text-gray-600 ml-4">
                        Subtotal: ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="flex flex-col justify-between items-end">
                    <button
                      onClick={() => removeFromCart(item.postId, item.shopId, item.attributes)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-20 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>

                {/* Items Count */}
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Items ({itemCount})</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Totals */}
                <div className="space-y-4">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total:</span>
                    <span className="text-green-600">${totalPrice.toFixed(2)}</span>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={() => router.push('/checkout')}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    Proceed to Checkout
                  </button>

                  {/* Continue Shopping Button */}
                  <button
                    onClick={() => router.back()}
                    className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors"
                  >
                    Continue Shopping
                  </button>

                  {/* Clear Cart Button */}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear your cart?')) {
                        clearCart();
                      }
                    }}
                    className="w-full px-6 py-2 text-red-600 hover:text-red-700 font-medium text-sm border border-red-300 rounded-lg transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>

                {/* Additional Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Note:</span> Shipping, taxes, and other fees will be calculated at checkout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
