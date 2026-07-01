import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once the two NEXT_PUBLIC_SUPABASE_* env vars are set (Vercel / .env.local). */
export const isSupabaseConfigured = Boolean(url && anon);

let _client: SupabaseClient | null = null;

/** Browser Supabase client, or null when not configured (app runs in guest mode). */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) _client = createBrowserClient(url as string, anon as string);
  return _client;
}
