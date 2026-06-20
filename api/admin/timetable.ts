import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const { batch, day, time, subjectId } = req.body;
    if (!batch || !day || !time || !subjectId)
      return res.status(400).json({ error: "Missing timetable scheduling elements" });

    const { count } = await supabase.from("timetable").select("*", { count: "exact", head: true });
    const id = `TT${String((count || 0) + 1).padStart(3, "0")}`;

    const { data, error } = await supabase
      .from("timetable")
      .insert({ id, batch, day, time, subject_id: subjectId })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json({
      success: true,
      timetableEntry: { id: data.id, batch: data.batch, day: data.day, time: data.time, subjectId: data.subject_id },
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
