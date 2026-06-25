import type { VercelRequest, VercelResponse } from "@vercel/node";

// Minimal test endpoint — no external imports.
// Used to isolate whether FUNCTION_INVOCATION_FAILED is caused by the runtime
// itself or by a specific module import.
export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    ok: true,
    message: "ping works",
    time: new Date().toISOString(),
    nodeVersion: process.version,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET,
  });
}
