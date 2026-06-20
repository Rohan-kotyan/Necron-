import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/data?type=students[&batch=A1&specialization=SD]
// GET /api/data?type=subjects
// GET /api/data?type=lecturers
// GET /api/data?type=batches
// GET /api/data?type=timetable&batch=A1
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { type, batch, specialization } = req.query;

  if (type === "batches") {
    return res.json({ batches: ["A1", "A2", "A3", "A4"] });
  }

  if (type === "students") {
    let query = supabase.from("students").select("id, name, email, registration_number, batch, specialization");
    if (batch) query = query.ilike("batch", batch as string);
    if (specialization) query = query.ilike("specialization", specialization as string);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const students = (data || []).map((s: any) => ({
      id: s.id, name: s.name, email: s.email,
      registrationNumber: s.registration_number,
      batch: s.batch, specialization: s.specialization,
    }));
    return res.json({ students });
  }

  if (type === "subjects") {
    const { data, error } = await supabase.from("subjects").select("id, name, lecturer_id");
    if (error) return res.status(500).json({ error: error.message });
    const subjects = (data || []).map((s: any) => ({ id: s.id, name: s.name, lecturerId: s.lecturer_id }));
    return res.json({ subjects });
  }

  if (type === "lecturers") {
    const { data, error } = await supabase.from("lecturers").select("id, name, email");
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ lecturers: data || [] });
  }

  if (type === "timetable") {
    let query = supabase.from("timetable").select("id, batch, day, time, subject_id");
    if (batch) query = query.ilike("batch", batch as string);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const timetable = (data || []).map((t: any) => ({
      id: t.id, batch: t.batch, day: t.day, time: t.time, subjectId: t.subject_id,
    }));
    return res.json({ timetable });
  }

  return res.status(400).json({ error: "Missing or invalid type param" });
}
