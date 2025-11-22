'use client';

import { useState } from 'react';
import { Product } from '@/types';

interface AddToCartButtonProps {
  product: Product;
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const handleAddToCart = () => {
    setAdding(true);

    // Get existing cart from localStorage
    const existingCart = localStorage.getItem('cart');
    const cart = existingCart ? JSON.parse(existingCart) : [];

    // Check if product already in cart
    const existingItemIndex = cart.findIndex((item: any) => item.id === product.id);

    if (existingItemIndex > -1) {
      // Update quantity
      cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.push({
        id: product.id,
        product: product,
        quantity: quantity,
        total: parseFloat(product.price) * quantity,
      });
    }

    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));

    // Dispatch custom event for cart update
    window.dispatchEvent(new Event('cartUpdated'));

    // Show success message
    alert('Đã thêm vào giỏ hàng!');
    setAdding(false);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Redirect to cart page
    window.location.href = '/gio-hang';
  };

  return (
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600">Số lượng:</label>
        <div className="flex items-center border border-gray-300 rounded-sm">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200"
          >
            −
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 h-8 text-center border-x border-gray-300 outline-none"
            min="1"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200"
          >
            +
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleAddToCart}
          disabled={adding || product.stock_status !== 'instock'}
          className="flex-1 border-2 border-primary text-primary py-3 rounded-sm hover:bg-primary hover:text-gray-900 transition-colors font-normal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {adding ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={adding || product.stock_status !== 'instock'}
          className="flex-1 bg-secondary text-gray-900 py-3 rounded-sm hover:opacity-90 transition-opacity font-normal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mua ngay
        </button>
      </div>
    </div>
  );
}
