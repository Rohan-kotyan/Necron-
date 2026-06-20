import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { studentId } = req.query;

  const { data, error } = await supabase
    .from("attendance")
    .select("id, student_id, subject_id, date, status")
    .eq("student_id", studentId as string);

  if (error) return res.status(500).json({ error: error.message });

  const attendance = (data || []).map((a: any) => ({
    id: a.id,
    studentId: a.student_id,
    subjectId: a.subject_id,
    date: a.date,
    status: a.status,
  }));

  return res.json({ attendance });
}
