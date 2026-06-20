import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase
    .from("attendance")
    .select(`
      id, date, status, student_id, subject_id,
      students ( name, registration_number, batch, specialization ),
      subjects ( name, lecturer_id, lecturers ( name ) )
    `);

  if (error) return res.status(500).json({ error: error.message });

  const history = (data || []).map((a: any) => ({
    id: a.id,
    date: a.date,
    status: a.status,
    studentId: a.student_id,
    studentName: a.students?.name || "Unknown Student",
    registrationNumber: a.students?.registration_number || "Unknown Reg No",
    batch: a.students?.batch || "Unknown Batch",
    specialization: a.students?.specialization || "N/A",
    subjectId: a.subject_id,
    subjectName: a.subjects?.name || "Unknown Subject",
    lecturerName: a.subjects?.lecturers?.name || "N/A",
  }));

  return res.json({ history });
}
