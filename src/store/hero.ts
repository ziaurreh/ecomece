import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface HeroSection {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  cta_text: string;
  cta_link: string;
  background_image?: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface HeroState {
  heroSections: HeroSection[];
  isLoading: boolean;
  loadHeroSections: () => Promise<void>;
  createHeroSection: (data: Partial<HeroSection>) => Promise<void>;
  updateHeroSection: (id: string, data: Partial<HeroSection>) => Promise<void>;
  deleteHeroSection: (id: string) => Promise<void>;
  toggleHeroStatus: (id: string, isActive: boolean) => Promise<void>;
}

export const useHeroStore = create<HeroState>((set, get) => ({
  heroSections: [],
  isLoading: false,

  loadHeroSections: async () => {
    set({ isLoading: true });
    
    const { data, error } = await supabase
      .from('hero_sections')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data) {
      set({ heroSections: data });
    }
    
    set({ isLoading: false });
  },

  createHeroSection: async (data) => {
    const { error } = await supabase
      .from('hero_sections')
      .insert(data);

    if (!error) {
      await get().loadHeroSections();
    } else {
      throw error;
    }
  },

  updateHeroSection: async (id, data) => {
    const { error } = await supabase
      .from('hero_sections')
      .update(data)
      .eq('id', id);

    if (!error) {
      await get().loadHeroSections();
    } else {
      throw error;
    }
  },

  deleteHeroSection: async (id) => {
    const { error } = await supabase
      .from('hero_sections')
      .delete()
      .eq('id', id);

    if (!error) {
      await get().loadHeroSections();
    } else {
      throw error;
    }
  },

  toggleHeroStatus: async (id, isActive) => {
    const { error } = await supabase
      .from('hero_sections')
      .update({ is_active: isActive })
      .eq('id', id);

    if (!error) {
      await get().loadHeroSections();
    } else {
      throw error;
    }
  },
}));