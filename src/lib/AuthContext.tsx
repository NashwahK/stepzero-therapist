// src/lib/AuthContext.tsx
// Wraps the app, tracks therapist auth state, and gates all routes
// behind a verified therapist role.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getSession, verifyTherapistRole } from './supabase';
import type { TherapistProfile } from './supabase';

interface AuthState {
  loading: boolean;
  therapist: TherapistProfile | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  therapist: null,
  error: null,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [therapist, setTherapist] = useState<TherapistProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('1. getting session...');
      const session = await getSession();
      console.log('2. session:', session);
      if (!session?.user) {
        setTherapist(null);
        return;
      }
      console.log('3. verifying therapist role for', session.user.id);
      const profile = await verifyTherapistRole(session.user.id);
      console.log('4. profile:', profile);
      setTherapist(profile);
    } catch (e: any) {
      console.error('5. refresh failed:', e);
      setTherapist(null);
      setError(e.message ?? 'Could not verify session.');
    } finally {
      setLoading(false);
      console.log('6. loading set to false');
    }
  };

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ loading, therapist, error, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}