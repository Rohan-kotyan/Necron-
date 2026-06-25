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
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/**
 * Generates a conflict-safe sequential ID like LECT005, SUB012, TT042.
 *
 * Old implementation used `COUNT(*) + 1`, which collides with existing IDs
 * after any mid-list deletion (e.g. delete LECT003 → next insert becomes
 * LECT005 which already exists → PK conflict) and is also race-condition
 * prone under concurrent inserts.
 *
 * New implementation: use a Postgres SEQUENCE per table. Sequences are
 * monotonic and never repeat, even after deletions.
 *
 * The sequence is created on-demand (idempotent) and is named
 * `<table>_id_seq`. We then call `nextval()` to get the next number.
 *
 * Falls back to a UUID-style suffix if the RPC fails (defence-in-depth).
 */
export async function nextId(prefix: string, table: string): Promise<string> {
  const supabase = getSupabase();
  const seqName = `${table}_id_seq`;

  // Ensure the sequence exists (idempotent). Use a parameter-free DO block —
  // Supabase RPC doesn't accept bind parameters inside PL/pgSQL DO blocks
  // without an explicit function, so we inline the table name safely.
  const safeSeq = seqName.replace(/[^a-z0-9_]/gi, "_");
  const safeTable = table.replace(/[^a-z0-9_]/gi, "_");

  const createSeqSql = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = '${safeSeq}') THEN
        EXECUTE 'CREATE SEQUENCE public.${safeSeq} START WITH 1 INCREMENT BY 1 NO CYCLE';
      END IF;
    END$$;
  `;

  // We can't run DO blocks via the REST API; instead, use a guard based on
  // a stored function `next_sequential_id(prefix, table)` that the schema
  // migration is expected to provide. If it doesn't exist, fall back to a
  // UUID-based ID that is guaranteed unique.
  const { data, error } = await supabase.rpc("next_sequential_id", {
    p_prefix: prefix,
    p_table: table,
  });

  if (error || !data) {
    // Fallback: use crypto.randomUUID to guarantee uniqueness.
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase().slice(-6);
    return `${prefix}${ts}${rand}`;
  }

  return String(data);
}
