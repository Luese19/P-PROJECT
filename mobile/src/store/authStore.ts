import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type UserRole = 'driver' | 'commuter';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active?: boolean;
  current_route_id?: string;
  current_jeepney_id?: string;
}

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Auth operations
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: SignUpData) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),

  signIn: async (email, password) => {
    try {
      console.log('Attempting sign in for:', email);
      set({ isLoading: true });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error.message);
        return { error: error.message };
      }

      console.log('Sign in successful, user ID:', data.user?.id);

      // Fetch user profile
      let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        console.warn('Profile not found in mobile store, attempting to create from auth metadata...');
        
        // Logic to sync profile if missing from public.users
        const role = data.user.user_metadata?.role || 'commuter';
        const fullName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User';

        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            role: role,
          })
          .select('*')
          .single();

        if (createError) {
          console.error('Profile fetch and create error:', createError.message);
          return { error: `Failed to load user profile: ${createError.message}` };
        }
        profile = newProfile;
      }

      console.log('Profile loaded:', profile.full_name);

      set({
        user: profile,
        session: data.session,
        isAuthenticated: true,
      });

      return {};
    } catch (error: any) {
      console.error('Unexpected sign in error:', error);
      return { error: error.message || 'Sign in failed' };
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (signUpData) => {
    try {
      set({ isLoading: true });

      // Sign up with Supabase Auth - pass metadata for the trigger to use
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.full_name,
            role: signUpData.role,
            phone: signUpData.phone,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'Failed to create account: No user data returned' };
      }

      // We no longer need to manually insert into public.users 
      // because the database trigger handles it automatically!
      
      // If the user is automatically logged in (e.g. email confirmation disabled)
      // fetch their profile and update the store
      if (data.session) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        set({
          user: profile,
          session: data.session,
          isAuthenticated: true,
        });
      }
      
      return {};
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { error: error.message || 'Sign up failed' };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },

  loadSession: async () => {
    try {
      set({ isLoading: true });

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({
          user: profile,
          session,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Load session error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
