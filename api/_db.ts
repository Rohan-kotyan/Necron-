import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy Supabase singleton — initialized on first use, not at module load.
 */
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/**
 * Generates a conflict-safe sequential ID like LECT005, SUB012, TT042.
 * Uses a Postgres SEQUENCE via the next_sequential_id() RPC function.
 * Falls back to a UUID-style suffix if the RPC fails.
 */
export async function nextId(prefix: string, table: string): Promise<string> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("next_sequential_id", {
    p_prefix: prefix,
    p_table: table,
  });

  if (error || !data) {
    // Fallback: use a timestamp + random suffix to guarantee uniqueness.
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase().slice(-6);
    return prefix + ts + rand;
  }

  return String(data);
}
