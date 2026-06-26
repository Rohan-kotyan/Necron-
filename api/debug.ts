import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return res.status(200).json({ ok: true, msg: "getSupabase import works" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
