import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { batch } = req.query;

  const { data, error } = await supabase
    .from("timetable")
    .select("id, batch, day, time, subject_id")
    .ilike("batch", batch as string);

  if (error) return res.status(500).json({ error: error.message });

  const timetable = (data || []).map((t: any) => ({
    id: t.id,
    batch: t.batch,
    day: t.day,
    time: t.time,
    subjectId: t.subject_id,
  }));

  return res.json({ timetable });
}
