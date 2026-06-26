import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getJwtSecret } from "./_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const secret = getJwtSecret();
    return res.status(200).json({ ok: true, secretLen: secret.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
