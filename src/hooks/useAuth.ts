'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  getUserProfile,
  signIn as supaSignIn,
  signUp as supaSignUp,
  signOut as supaSignOut,
} from '@/lib/supabase';
import type { User } from '@/types';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Fetch user profile from users table
        getUserProfile(session.user.id).then(({ data }) => {
          if (data) setUser(data as User);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await getUserProfile(session.user.id);
        if (data) setUser(data as User);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    return supaSignUp(email, password);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return supaSignIn(email, password);
  }, []);

  const signOut = useCallback(async () => {
    const result = await supaSignOut();
    setUser(null);
    setSession(null);
    return result;
  }, []);

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      const { data } = await getUserProfile(session.user.id);
      if (data) setUser(data as User);
    }
  }, [session]);

  return { session, user, loading, signUp, signIn, signOut, refreshUser };
}
