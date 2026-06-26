import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase } from "./_db";
import { getJwtSecret } from "./_auth";
import { verifyPassword, safeEqual } from "./_password";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = getSupabase();
    const secret = getJwtSecret();
    return res.status(200).json({ ok: true, hasSupabase: !!supabase, secretLen: secret.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack?.split("\n").slice(0, 5) });
  }
}
