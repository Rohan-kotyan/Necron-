import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({ error: "Missing env vars", hasUrl: !!url, hasKey: !!key });
    }
    // Test the key
    const client = createClient(url, key);
    const { data, error } = await client.from("students").select("id, registration_number").limit(2);
    if (error) {
      return res.status(500).json({ error: error.message, code: error.code, keyPrefix: key.slice(0, 15) });
    }
    return res.status(200).json({ ok: true, sample: data, keyPrefix: key.slice(0, 15) + "..." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
