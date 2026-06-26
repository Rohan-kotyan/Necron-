import jwt from "jsonwebtoken";
import { getSupabase } from "./_db";
import { getJwtSecret } from "./_auth";
import { verifyPassword, safeEqual } from "./_password";

export default async function handler(req: any, res: any) {
  try {
    const supabase = getSupabase();
    const secret = getJwtSecret();
    const token = jwt.sign({ test: true }, secret, { expiresIn: "1h" });
    return res.status(200).json({ ok: true, hasSupabase: !!supabase, token: token.slice(0,20) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack?.split("\n").slice(0,5) });
  }
}
