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
import { clearManuals } from './useManuals';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: never stay loading more than 5 seconds
    const timeout = setTimeout(() => setLoading(false), 5000);

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          getUserProfile(session.user.id)
            .then(({ data }) => {
              if (data) setUser(data as User);
              clearTimeout(timeout);
              setLoading(false);
            })
            .catch(() => {
              clearTimeout(timeout);
              setLoading(false);
            });
        } else {
          clearTimeout(timeout);
          setLoading(false);
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        try {
          const { data } = await getUserProfile(session.user.id);
          if (data) setUser(data as User);
        } catch {
          /* noop */
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    return supaSignUp(email, password);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return supaSignIn(email, password);
  }, []);

  const signOut = useCallback(async () => {
    clearManuals();
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
