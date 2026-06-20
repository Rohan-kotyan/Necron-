import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { subjectId, date, records } = req.body;

  if (!subjectId || !date || !Array.isArray(records))
    return res.status(400).json({ error: "Missing required fields for marking attendance" });

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
