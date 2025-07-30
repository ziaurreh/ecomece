import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  checkIsAdmin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAdmin: false,

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  },

  signUp: async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAdmin: false });
  },

  checkIsAdmin: async () => {
    const { user } = get();
    if (!user) {
      set({ isAdmin: false });
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    set({ isAdmin: !!data });
  },
}));

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    isLoading: false,
  });

  if (session?.user) {
    setTimeout(() => {
      useAuthStore.getState().checkIsAdmin();
    }, 0);
  } else {
    useAuthStore.setState({ isAdmin: false });
  }
});

// Check for existing session
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    isLoading: false,
  });

  if (session?.user) {
    setTimeout(() => {
      useAuthStore.getState().checkIsAdmin();
    }, 0);
  }
});