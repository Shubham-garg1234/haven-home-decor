import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from './AuthContext';
import { CartItem } from '@/types';
import { toast } from 'sonner';

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && session?.access_token) {
      fetchCartItems();
    } else {
      setItems([]);
    }
  }, [user, session]);

  const fetchCartItems = async () => {
    if (!user || !session?.access_token) return;
    
    setIsLoading(true);
    try {
      const response = await api.getCart(session.access_token);
      // Transform API response to match CartItem type
      const transformedItems = response.items.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        created_at: item.created_at,
        updated_at: item.updated_at,
        product: item.product || item.products,
        variant: item.variant || item.variants,
      }));
      setItems(transformedItems);
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      toast.error(error.message || 'Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (productId: string, quantity = 1, variantId?: string) => {
    if (!user || !session?.access_token) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    const existingItem = items.find(
      item => item.product_id === productId && item.variant_id === (variantId || null)
    );

    if (existingItem) {
      await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      return;
    }

    try {
      await api.addToCart(productId, variantId || null, quantity, session.access_token);
      toast.success('Added to cart');
      fetchCartItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item to cart');
      console.error(error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!session?.access_token) return;

    try {
      await api.removeFromCart(itemId, session.access_token);
      setItems(items.filter(item => item.id !== itemId));
      toast.success('Removed from cart');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!session?.access_token) return;

    if (quantity < 1) {
      await removeFromCart(itemId);
      return;
    }

    try {
      const response = await api.updateCartItem(itemId, quantity, session.access_token);
      setItems(items.map(item => 
        item.id === itemId ? { ...item, quantity: response.item.quantity } : item
      ));
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quantity');
    }
  };

  const clearCart = async () => {
    if (!user || !session?.access_token) return;

    try {
      await api.clearCart(session.access_token);
      setItems([]);
      toast.success('Cart cleared');
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear cart');
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      items,
      isLoading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      itemCount,
      subtotal,
      total: subtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
