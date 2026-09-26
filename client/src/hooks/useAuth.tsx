// ============================================================================
// File: client/src/hooks/useAuth.tsx
// Supabase Authentication & Demo Session Hook
// ============================================================================
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isClientSupabaseReady = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http') && !supabaseUrl.includes('your-project')
);

export const supabaseClient: SupabaseClient | null = isClientSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface AppUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  isDemo?: boolean;
}

const DEFAULT_DEMO_USER: AppUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'student@visualmind.ai',
  full_name: 'Alex Chen',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  isDemo: true,
};

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithDemo: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithDemo: () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('visualmind_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_DEMO_USER;
      }
    }
    return DEFAULT_DEMO_USER;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supabaseClient) {
      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          syncSupabaseUser(session.user, session.access_token);
        }
      });

      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          syncSupabaseUser(session.user, session.access_token);
        } else if (!user?.isDemo) {
          setUser(null);
          localStorage.removeItem('visualmind_user');
          localStorage.removeItem('visualmind_token');
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const syncSupabaseUser = (sbUser: User, token: string) => {
    const appUser: AppUser = {
      id: sbUser.id,
      email: sbUser.email || '',
      full_name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0],
      avatar_url: sbUser.user_metadata?.avatar_url,
      isDemo: false,
    };
    setUser(appUser);
    localStorage.setItem('visualmind_user', JSON.stringify(appUser));
    localStorage.setItem('visualmind_token', token);
  };

  const signInWithDemo = () => {
    setUser(DEFAULT_DEMO_USER);
    localStorage.setItem('visualmind_user', JSON.stringify(DEFAULT_DEMO_USER));
    localStorage.setItem('visualmind_token', 'demo-token');
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      if (data.session) syncSupabaseUser(data.session.user, data.session.access_token);
    } else {
      const demo: AppUser = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        email,
        full_name: email.split('@')[0],
        isDemo: true,
      };
      setUser(demo);
      localStorage.setItem('visualmind_user', JSON.stringify(demo));
      localStorage.setItem('visualmind_token', 'demo-token');
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password: pass,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      if (data.session) syncSupabaseUser(data.session.user, data.session.access_token);
    } else {
      const demo: AppUser = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        email,
        full_name: name || email.split('@')[0],
        isDemo: true,
      };
      setUser(demo);
      localStorage.setItem('visualmind_user', JSON.stringify(demo));
      localStorage.setItem('visualmind_token', 'demo-token');
    }
  };

  const signInWithGoogle = async () => {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } else {
      signInWithDemo();
    }
  };

  const signOut = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('visualmind_user');
    localStorage.removeItem('visualmind_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithDemo,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
