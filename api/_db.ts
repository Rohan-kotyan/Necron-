import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy Supabase singleton — initialized on first use, not at module load.
 * This means missing env vars on preview deployments surface as a clean
 * 500 JSON error from the handler, instead of crashing the function
 * during cold-start import (which produces the empty-body Vercel error
 * that previously broke the login screen).
 */
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured on this deployment. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  _client = createClient(url, key);
  return _client;
}

/**
 * Generates a count-based ID like TT001, SUB005, LECT003 — matches the
 * convention used by the existing admin endpoints.
 */
export async function nextId(prefix: string, table: string): Promise<string> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return `${prefix}${String((count || 0) + 1).padStart(3, "0")}`;
}
