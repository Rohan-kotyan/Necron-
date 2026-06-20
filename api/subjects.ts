import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, lecturer_id");

  if (error) return res.status(500).json({ error: error.message });

  const subjects = (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    lecturerId: s.lecturer_id,
  }));

  return res.json({ subjects });
}
