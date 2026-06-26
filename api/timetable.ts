import { getSupabase } from "./_db";
import { requireAuth } from "./_auth";

/**
 * GET /api/timetable          → list entries (auth: any role)
 * GET /api/timetable?batch=A1 → filter by batch (lecturer/admin only)
 *
 * Students are restricted to their own batch — enforced server-side.
 *
 * Returns: { timetable: [...] }
 * Each entry: { id, batch, day, time, subjectId, subjectName, lecturerId, lecturerName, isBreak }
 */
function mapRow(r: any) {
  return {
    id: r.id,
    batch: r.batch,
    day: r.day,
    time: r.time,
    subjectId: r.subject_id,
    subjectName: r.subjects?.name ?? null,
    lecturerId: r.subjects?.lecturer_id ?? null,
    lecturerName: r.subjects?.lecturers?.name ?? null,
    isBreak: r.subject_id === "BREAK",
  };
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const ctx = requireAuth(req, res);
    if (!ctx) return;

    const supabase = getSupabase();
    let query = supabase
      .from("timetable")
      .select(
        "id, batch, day, time, subject_id, subjects ( name, lecturer_id, lecturers ( name ) )"
      );

    // Students are restricted to their own batch — enforced server-side.
    if (ctx.role === "student") {
      if (!ctx.batch) {
        return res
          .status(400)
          .json({ error: "Student account has no batch assignment." });
      }
      query = query.eq("batch", ctx.batch);
    } else {
      // Lecturer / Admin can optionally filter.
      const batch = req.query.batch as string | undefined;
      if (batch) query = query.eq("batch", batch);
    }

    const { data, error } = await query.order("batch").order("day").order("time");
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ timetable: (data || []).map(mapRow) });
  } catch (err: any) {
    console.error("[api/timetable] unhandled error:", err);
    return res.status(500).json({
      error:
        err?.message ||
        "The timetable service encountered an unexpected error.",
    });
  }
}
