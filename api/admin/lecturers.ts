import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/lecturers        → add lecturer
// DELETE /api/admin/lecturers?id=X → delete lecturer
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Lecturer credentials lack required inputs" });

    const { count } = await supabase.from("lecturers").select("*", { count: "exact", head: true });
    const id = `LECT${String((count || 0) + 1).padStart(3, "0")}`;

    const { data, error } = await supabase
      .from("lecturers").insert({ id, name, email, password }).select().single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, lecturer: data });
  }

  if (req.method === "DELETE") {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: "ID required" });
    const { error } = await supabase.from("lecturers").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
