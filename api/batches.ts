import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({ batches: ["A1", "A2", "A3", "A4"] });
}
