import type { VercelRequest, VercelResponse } from "@vercel/node";

// MINIMAL version — testing if the function runtime itself works
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return res.status(200).json({
      ok: true,
      message: "minimal login works",
      nodeVersion: process.version,
      hasEnv: !!process.env.SUPABASE_URL,
      body: req.body,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
