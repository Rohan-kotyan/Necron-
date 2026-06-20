import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === "DELETE") {
    const { error } = await supabase.from("lecturers").delete().eq("id", id as string);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
