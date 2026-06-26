import { getSupabase } from "./_db";
import { requireAuth, requireRole } from "./_auth";

/**
 * Attendance endpoint — role-scoped reads & writes.
 *
 *   GET  /api/attendance?type=history                     (lecturer/admin only)
 *   GET  /api/attendance?type=student&id=STUD001          (scoped to caller)
 *   POST /api/attendance { subjectId, date, records[] }   (lecturer/admin only)
 *
 * Security:
 *   • All routes require a valid Bearer JWT.
 *   • Students can only read their OWN attendance — the `id` query param
 *     is overridden by their JWT userId.
 *   • Lecturers/admins can read any student and mark attendance.
 *   • POST uses deterministic IDs (`ATT_<studentId>_<subjectId>_<date>`)
 *     so the unique constraint `(student_id, subject_id, date)` upserts
 *     cleanly. The old random-ID approach broke upsert semantics.
 */

function mapHistoryRow(a: any) {
  return {
    id: a.id,
    date: a.date,
    status: a.status,
    studentId: a.student_id,
    studentName: a.students?.name || "Unknown Student",
    registrationNumber: a.students?.registration_number || "Unknown",
    batch: a.students?.batch || "Unknown",
    specialization: a.students?.specialization || "N/A",
    subjectId: a.subject_id,
    subjectName: a.subjects?.name || "Unknown Subject",
    lecturerName: a.subjects?.lecturers?.name || "N/A",
  };
}

export default async function handler(req: any, res: any) {
  try {
    const ctx = requireAuth(req, res);
    if (!ctx) return;

    const supabase = getSupabase();

    // ─── GET ─────────────────────────────────────────────────────
    if (req.method === "GET") {
      const { type, id } = req.query;

      if (type === "history") {
        // Lecturer/admin only — students can't dump the whole ledger.
        if (ctx.role === "student") {
          return res
            .status(403)
            .json({ error: "Students cannot view the full attendance history." });
        }
        const { data, error } = await supabase
          .from("attendance")
          .select(`
            id, date, status, student_id, subject_id,
            students ( name, registration_number, batch, specialization ),
            subjects ( name, lecturer_id, lecturers ( name ) )
          `)
          .order("date", { ascending: false })
          .order("student_id")
          .limit(2000);  // safety cap; pagination should be added for large datasets
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ history: (data || []).map(mapHistoryRow) });
      }

      if (type === "student" && id) {
        // Students can only read their OWN attendance.
        const targetId = ctx.role === "student" ? ctx.userId : (id as string);
        if (ctx.role === "student" && targetId !== ctx.userId) {
          return res
            .status(403)
            .json({ error: "Students can only view their own attendance." });
        }
        const { data, error } = await supabase
          .from("attendance")
          .select("id, student_id, subject_id, date, status")
          .eq("student_id", targetId)
          .order("date", { ascending: false });
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

      return res.status(400).json({ error: "Missing type param" });
    }

    // ─── POST (mark attendance) ──────────────────────────────────
    if (req.method === "POST") {
      // Only lecturers and admins can mark attendance.
      const writeCtx = requireRole(req, res, ["lecturer", "admin"]);
      if (!writeCtx) return;

      const { subjectId, date, records } = req.body || {};
      if (!subjectId || !date || !Array.isArray(records) || records.length === 0) {
        return res
          .status(400)
          .json({ error: "Missing required fields: subjectId, date, records[]" });
      }

      // Validate subject exists (unless BREAK).
      if (subjectId !== "BREAK") {
        const { data: subj } = await supabase
          .from("subjects")
          .select("id")
          .eq("id", subjectId)
          .maybeSingle();
        if (!subj) {
          return res
            .status(400)
            .json({ error: `Subject ${subjectId} does not exist.` });
        }
      }

      // Use the LOCAL date (not UTC) — `new Date().toISOString()` lands on
      // the wrong calendar day in timezones east of UTC for late classes.
      const cleanDate = String(date).split("T")[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return res
          .status(400)
          .json({ error: `Invalid date format (expected YYYY-MM-DD): ${cleanDate}` });
      }

      // Deterministic IDs: ATT_<studentId>_<subjectId>_<date>
      // The unique constraint (student_id, subject_id, date) makes the
      // upsert update the existing row instead of inserting duplicates.
      const upsertRows = records.map(
        (rec: { studentId: string; status: string }) => {
          if (!rec.studentId || !rec.status) {
            throw new Error("Each record must have studentId and status.");
          }
          if (rec.status !== "Present" && rec.status !== "Absent") {
            throw new Error(`Invalid status: ${rec.status}`);
          }
          return {
            id: `ATT_${rec.studentId}_${subjectId}_${cleanDate}`,
            student_id: rec.studentId,
            subject_id: subjectId,
            date: cleanDate,
            status: rec.status,
          };
        }
      );

      const { error } = await supabase
        .from("attendance")
        .upsert(upsertRows, { onConflict: "student_id,subject_id,date" });

      if (error) return res.status(500).json({ error: error.message });
      return res.json({
        success: true,
        message: "Attendance saved successfully!",
        count: upsertRows.length,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[attendance] unhandled error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error." });
  }
}
