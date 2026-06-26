import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import { getSupabase } from "./_db";
import { getJwtSecret } from "./_auth";
import { verifyPassword, safeEqual } from "./_password";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test 1: getSupabase
    const supabase = getSupabase();
    // Test 2: getJwtSecret
    const secret = getJwtSecret();
    // Test 3: verifyPassword
    const hash = "$2b$10$test";
    const ok = await verifyPassword("test", hash);
    // Test 4: jwt sign
    const token = jwt.sign({ test: true }, secret, { expiresIn: "1h" });
    return res.status(200).json({
      ok: true,
      supabase: !!supabase,
      secret: secret.slice(0, 8) + "...",
      verifyResult: ok,
      token: token.slice(0, 20) + "...",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack?.split("\n").slice(0, 5) });
  }
}
