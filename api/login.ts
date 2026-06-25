import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Test 3: Check env var values
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return res.status(200).json({
      url: url ? url.slice(0, 30) + "..." : "MISSING",
      keyPrefix: key ? key.slice(0, 10) + "..." : "MISSING",
      keyLength: key ? key.length : 0,
      expectedPrefix: "sbp_",
      keyStartsWithSbp: key ? key.startsWith("sbp_") : false,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
