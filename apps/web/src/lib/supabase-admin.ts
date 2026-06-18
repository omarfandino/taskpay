import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** Server-side Supabase client (service role preferred; falls back to anon). */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!url || !key) return null;
  return createClient(url, key);
}
