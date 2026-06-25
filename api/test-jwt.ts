import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

// Test: can we import and use jsonwebtoken on Vercel's Node 24 runtime?
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = jwt.sign({ test: true }, "testsecret", { expiresIn: "1h" });
    const decoded = jwt.verify(token, "testsecret") as any;
    return res.status(200).json({ ok: true, decoded });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
