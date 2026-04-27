import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Browser Supabase client (anon key). Use for future Supabase Auth or RLS-backed reads.
 * Listing bookings/waitlist today goes through /api/admin/* (service role on server).
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
