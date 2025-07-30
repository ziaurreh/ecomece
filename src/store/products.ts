import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_price?: number;
  category_id?: string;
  images: string[];
  inventory_count: number;
  sku?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: {
    name: string;
  };
}

interface ProductsState {
  products: Product[];
  categories: any[];
  isLoading: boolean;
  filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    searchQuery?: string;
  };
  sortBy: 'name' | 'price' | 'created_at';
  sortOrder: 'asc' | 'desc';
  loadProducts: () => Promise<void>;
  loadCategories: () => Promise<void>;
  setFilters: (filters: any) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  getFilteredProducts: () => Product[];
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  filters: {},
  sortBy: 'created_at',
  sortOrder: 'desc',

  loadProducts: async () => {
    set({ isLoading: true });
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          name
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ products: data });
    }
    
    set({ isLoading: false });
  },

  loadCategories: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (!error && data) {
      set({ categories: data });
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  setSorting: (sortBy, sortOrder) => {
    set({ sortBy: sortBy as any, sortOrder });
  },

  getFilteredProducts: () => {
    const { products, filters, sortBy, sortOrder } = get();
    
    let filtered = [...products];

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(p => p.category_id === filters.category);
    }

    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice!);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  },
}));