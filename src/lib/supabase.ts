// src/lib/supabase.ts
// Supabase client for the therapist dashboard.
// Same project as the patient app — shares the auth.users table,
// but only users with role = 'therapist' are allowed past login.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    'Supabase env vars missing. Add VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface TherapistProfile {
  id: string;
  name: string;
  specialisation: string | null;
  role: string;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

/**
 * Confirms the logged-in user has role = 'therapist' in the users table.
 * Returns the profile if valid, throws if not a therapist.
 * This is the gate that prevents a patient account from ever reaching
 * the dashboard, even if they somehow got a valid session token.
 */
export async function verifyTherapistRole(userId: string): Promise<TherapistProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (error) throw new Error('Could not verify account role.');
  if (data.role !== 'therapist') {
    throw new Error('This account is not registered as a therapist.');
  }

  // Pull display info from therapist_profiles — using the real column names
  const { data: profile } = await supabase
    .from('therapist_profiles')
    .select('id, specialisations')
    .eq('id', userId)
    .maybeSingle();

  return {
    id: userId,
    name: 'Therapist',
    specialisation: profile?.specialisations?.join(', ') ?? null,
    role: data.role,
  };
}

export interface TherapistProfileDetail {
  id: string;
  licenseNumber: string | null;
  specialisations: string[];
  languages: string[];
  acceptsNewClients: boolean;
}

/**
 * Fetches the full editable therapist_profiles row for the Settings page.
 * Separate from verifyTherapistRole's lightweight version since Settings
 * needs every editable field, not just a display summary.
 */
export async function getTherapistProfileDetail(userId: string): Promise<TherapistProfileDetail | null> {
  const { data, error } = await supabase
    .from('therapist_profiles')
    .select('id, license_number, specialisations, languages, accepts_new_clients')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    licenseNumber: data.license_number,
    specialisations: data.specialisations ?? [],
    languages: data.languages ?? [],
    acceptsNewClients: data.accepts_new_clients ?? false,
  };
}

/**
 * Updates the editable fields on therapist_profiles. Upserts so it works
 * whether or not a row already exists for this therapist.
 */
export async function updateTherapistProfile(
  userId: string,
  fields: { licenseNumber: string; specialisations: string[]; languages: string[]; acceptsNewClients: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('therapist_profiles')
    .upsert({
      id: userId,
      license_number: fields.licenseNumber || null,
      specialisations: fields.specialisations,
      languages: fields.languages,
      accepts_new_clients: fields.acceptsNewClients,
    });

  if (error) throw error;
}