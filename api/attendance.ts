import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET  /api/attendance?type=history           → full history with joins
// GET  /api/attendance?type=student&id=STUDXX → student attendance
// POST /api/attendance                         → mark attendance
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const { type, id } = req.query;

    if (type === "history") {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id, date, status, student_id, subject_id,
          students ( name, registration_number, batch, specialization ),
          subjects ( name, lecturer_id, lecturers ( name ) )
        `);
      if (error) return res.status(500).json({ error: error.message });

      const history = (data || []).map((a: any) => ({
        id: a.id, date: a.date, status: a.status,
        studentId: a.student_id,
        studentName: a.students?.name || "Unknown Student",
        registrationNumber: a.students?.registration_number || "Unknown",
        batch: a.students?.batch || "Unknown",
        specialization: a.students?.specialization || "N/A",
        subjectId: a.subject_id,
        subjectName: a.subjects?.name || "Unknown Subject",
        lecturerName: a.subjects?.lecturers?.name || "N/A",
      }));
      return res.json({ history });
    }

    if (type === "student" && id) {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, student_id, subject_id, date, status")
        .eq("student_id", id as string);
      if (error) return res.status(500).json({ error: error.message });

      const attendance = (data || []).map((a: any) => ({
        id: a.id, studentId: a.student_id,
        subjectId: a.subject_id, date: a.date, status: a.status,
      }));
      return res.json({ attendance });
    }

    return res.status(400).json({ error: "Missing type param" });
  }

  if (req.method === "POST") {
    const { subjectId, date, records } = req.body;
    if (!subjectId || !date || !Array.isArray(records))
      return res.status(400).json({ error: "Missing required fields" });

    const cleanDate = date.split("T")[0];
    const upsertRows = records.map((rec: { studentId: string; status: string }) => ({
      id: `ATT_${Date.now()}_${rec.studentId}_${Math.floor(Math.random() * 1000)}`,
      student_id: rec.studentId,
      subject_id: subjectId,
      date: cleanDate,
      status: rec.status,
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(upsertRows, { onConflict: "student_id,subject_id,date" });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: "Attendance saved successfully!", count: records.length });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
