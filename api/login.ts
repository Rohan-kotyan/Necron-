import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

// Test 1: Add jwt import only
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = jwt.sign({ test: true }, "test", { expiresIn: "1h" });
    return res.status(200).json({ ok: true, jwt: token.slice(0, 30) + "..." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
