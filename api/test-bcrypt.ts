import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";

// Test: can we import and use bcryptjs on Vercel's Node 24 runtime?
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const hash = await bcrypt.hash("test", 10);
    const ok = await bcrypt.compare("test", hash);
    return res.status(200).json({ ok, hash: hash.slice(0, 30) + "..." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
