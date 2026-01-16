import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { CartItem, Product } from '@/types';
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCartItems();
    } else {
      setItems([]);
    }
  }, [user]);

  const fetchCartItems = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching cart:', error);
    } else {
      setItems(data as CartItem[]);
    }
    setIsLoading(false);
  };

  const addToCart = async (productId: string, quantity = 1, variantId?: string) => {
    if (!user) {
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

    const { error } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        product_id: productId,
        variant_id: variantId || null,
        quantity,
      });

    if (error) {
      toast.error('Failed to add item to cart');
      console.error(error);
    } else {
      toast.success('Added to cart');
      fetchCartItems();
    }
  };

  const removeFromCart = async (itemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast.error('Failed to remove item');
    } else {
      setItems(items.filter(item => item.id !== itemId));
      toast.success('Removed from cart');
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(itemId);
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    if (error) {
      toast.error('Failed to update quantity');
    } else {
      setItems(items.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const clearCart = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to clear cart');
    } else {
      setItems([]);
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
