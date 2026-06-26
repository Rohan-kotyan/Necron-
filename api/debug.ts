// Test: can we even import _auth.ts at all?
import { getJwtSecret } from "./_auth";

export default async function handler(req: any, res: any) {
  try {
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
