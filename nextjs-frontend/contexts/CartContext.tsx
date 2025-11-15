'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: number;
  postId: number;
  shopId: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
  product_type: string;
  type: 'post' | 'page';
  attributes?: {
    [key: string]: string;
  };
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (postId: number, shopId: number, attributes?: any) => void;
  updateQuantity: (postId: number, shopId: number, quantity: number, attributes?: any) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getCartItems: () => CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('shopping_cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('shopping_cart', JSON.stringify(items));
    }
  }, [items, isHydrated]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prevItems) => {
      // Check if item with same postId, shopId, and attributes already exists
      const existingItem = prevItems.find(
        (i) =>
          i.postId === item.postId &&
          i.shopId === item.shopId &&
          JSON.stringify(i.attributes) === JSON.stringify(item.attributes)
      );

      if (existingItem) {
        // Increment quantity if item exists
        return prevItems.map((i) =>
          i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      // Add new item
      return [
        ...prevItems,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (postId: number, shopId: number, attributes?: any) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(
            item.postId === postId &&
            item.shopId === shopId &&
            JSON.stringify(item.attributes) === JSON.stringify(attributes)
          )
      )
    );
  };

  const updateQuantity = (postId: number, shopId: number, quantity: number, attributes?: any) => {
    if (quantity <= 0) {
      removeFromCart(postId, shopId, attributes);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.postId === postId &&
        item.shopId === shopId &&
        JSON.stringify(item.attributes) === JSON.stringify(attributes)
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartItems = () => {
    return items;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        getCartItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
