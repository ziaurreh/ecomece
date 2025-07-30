import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from './auth';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    name: string;
    price: number;
    images: string[];
  };
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loadCart: () => Promise<void>;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: async (productId: string, quantity = 1) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        set({ isLoading: true });
        
        const { error } = await supabase
          .from('cart_items')
          .upsert({
            user_id: user.id,
            product_id: productId,
            quantity,
          }, {
            onConflict: 'user_id,product_id',
          });

        if (!error) {
          await get().loadCart();
        }
        
        set({ isLoading: false });
      },

      removeItem: async (productId: string) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        set({ isLoading: true });
        
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (!error) {
          await get().loadCart();
        }
        
        set({ isLoading: false });
      },

      updateQuantity: async (productId: string, quantity: number) => {
        if (quantity <= 0) {
          await get().removeItem(productId);
          return;
        }

        const { user } = useAuthStore.getState();
        if (!user) return;

        set({ isLoading: true });
        
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (!error) {
          await get().loadCart();
        }
        
        set({ isLoading: false });
      },

      clearCart: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        set({ isLoading: true });
        
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        if (!error) {
          set({ items: [] });
        }
        
        set({ isLoading: false });
      },

      loadCart: async () => {
        const { user } = useAuthStore.getState();
        if (!user) {
          set({ items: [] });
          return;
        }

        set({ isLoading: true });
        
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            quantity,
            products:product_id (
              name,
              price,
              images
            )
          `)
          .eq('user_id', user.id);

        if (!error && data) {
          const items = data.map(item => ({
            ...item,
            product: item.products as any,
            products: undefined,
          }));
          set({ items });
        }
        
        set({ isLoading: false });
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);