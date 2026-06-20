import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/timetable        → add entry
// DELETE /api/admin/timetable?id=X → delete entry
// POST /api/admin/timetable with type=subject → add subject
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const { type, name, lecturerId, batch, day, time, subjectId } = req.body;

    if (type === "subject") {
      if (!name || !lecturerId)
        return res.status(400).json({ error: "Missing subject details" });
      const { count } = await supabase.from("subjects").select("*", { count: "exact", head: true });
      const id = `SUB${String((count || 0) + 1).padStart(3, "0")}`;
      const { data, error } = await supabase
        .from("subjects").insert({ id, name, lecturer_id: lecturerId }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ success: true, subject: { id: data.id, name: data.name, lecturerId: data.lecturer_id } });
    }

    // default: timetable entry
    if (!batch || !day || !time || !subjectId)
      return res.status(400).json({ error: "Missing timetable scheduling elements" });
    const { count } = await supabase.from("timetable").select("*", { count: "exact", head: true });
    const id = `TT${String((count || 0) + 1).padStart(3, "0")}`;
    const { data, error } = await supabase
      .from("timetable").insert({ id, batch, day, time, subject_id: subjectId }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({
      success: true,
      timetableEntry: { id: data.id, batch: data.batch, day: data.day, time: data.time, subjectId: data.subject_id },
    });
  }

  if (req.method === "DELETE") {
    const { id, type } = req.query;
    if (!id) return res.status(400).json({ error: "ID required" });
    const table = type === "subject" ? "subjects" : "timetable";
    const { error } = await supabase.from(table).delete().eq("id", id as string);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
