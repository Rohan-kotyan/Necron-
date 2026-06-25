import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Test: can we import and use @supabase/supabase-js on Vercel's Node 24 runtime?
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({ error: "Missing env vars" });
    }
    const client = createClient(url, key);
    // Simple query — just check if we can connect
    const { data, error } = await client
      .from("students")
      .select("id, registration_number")
      .limit(1);
    if (error) {
      return res.status(500).json({ error: error.message, code: error.code });
    }
    return res.status(200).json({ ok: true, sample: data?.[0] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
