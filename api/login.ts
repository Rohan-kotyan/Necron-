import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Test 2: Add supabase import only
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await client
      .from("students")
      .select("id, registration_number")
      .limit(1);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, sample: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
