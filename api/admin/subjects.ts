import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const { name, lecturerId } = req.body;
    if (!name || !lecturerId)
      return res.status(400).json({ error: "Missing subject details" });

    const { count } = await supabase.from("subjects").select("*", { count: "exact", head: true });
    const id = `SUB${String((count || 0) + 1).padStart(3, "0")}`;

    const { data, error } = await supabase
      .from("subjects")
      .insert({ id, name, lecturer_id: lecturerId })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json({
      success: true,
      subject: { id: data.id, name: data.name, lecturerId: data.lecturer_id },
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
