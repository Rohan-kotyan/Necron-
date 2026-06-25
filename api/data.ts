import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase } from "./_db";
import { requireAuth, requireRole } from "./_auth";

/**
 * GET /api/data?type=...
 *
 * Auth: every request requires a valid Bearer JWT.
 *
 *  type=batches       → list of distinct batches (lecturer/admin only)
 *  type=students      → list of students (lecturer/admin only; optionally filtered by batch/specialization)
 *  type=subjects      → list of subjects (any authenticated role)
 *  type=lecturers     → list of lecturers (lecturer/admin only)
 *  type=timetable     → list of timetable entries (any authenticated role; students scoped to own batch)
 *
 * The previous version had NO authentication and dumped the full student
 * roster / attendance history to the world. That was a critical hole.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const ctx = requireAuth(req, res);
    if (!ctx) return;

    const { type, batch, specialization } = req.query;
    const supabase = getSupabase();

    // ─── batches ─────────────────────────────────────────────────
    if (type === "batches") {
      // Lecturer/admin only — students shouldn't enumerate all batches.
      if (ctx.role === "student") {
        return res.json({ batches: ctx.batch ? [ctx.batch] : [] });
      }
      // Query distinct batches from the timetable + students tables.
      const [ttRes, studRes] = await Promise.all([
        supabase.from("timetable").select("batch"),
        supabase.from("students").select("batch"),
      ]);
      const set = new Set<string>();
      for (const r of (ttRes.data || []) as any[]) if (r.batch) set.add(r.batch);
      for (const r of (studRes.data || []) as any[]) if (r.batch) set.add(r.batch);
      const batches = Array.from(set).sort();
      return res.json({ batches: batches.length > 0 ? batches : ["A1", "A2", "A3", "A4"] });
    }

    // ─── students ────────────────────────────────────────────────
    if (type === "students") {
      // Lecturer/admin only.
      if (ctx.role === "student") {
        return res
          .status(403)
          .json({ error: "Students cannot enumerate the student roster." });
      }
      let query = supabase
        .from("students")
        .select("id, name, email, registration_number, batch, specialization");
      if (batch) query = query.eq("batch", batch as string);
      if (specialization) query = query.eq("specialization", specialization as string);
      const { data, error } = await query.order("name");
      if (error) return res.status(500).json({ error: error.message });
      const students = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        registrationNumber: s.registration_number,
        batch: s.batch,
        specialization: s.specialization,
      }));
      return res.json({ students });
    }

    // ─── subjects ────────────────────────────────────────────────
    if (type === "subjects") {
      let query = supabase
        .from("subjects")
        .select("id, name, lecturer_id, lecturers ( name )");
      // Students see only subjects that appear in their own batch's timetable.
      if (ctx.role === "student" && ctx.batch) {
        const { data: ttData } = await supabase
          .from("timetable")
          .select("subject_id")
          .eq("batch", ctx.batch);
        const subjectIds = Array.from(
          new Set((ttData || []).map((t: any) => t.subject_id).filter(Boolean))
        );
        if (subjectIds.length === 0) return res.json({ subjects: [] });
        query = query.in("id", subjectIds);
      }
      const { data, error } = await query.order("name");
      if (error) return res.status(500).json({ error: error.message });
      const subjects = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        lecturerId: s.lecturer_id,
        lecturerName: s.lecturers?.name ?? null,
      }));
      return res.json({ subjects });
    }

    // ─── lecturers ───────────────────────────────────────────────
    if (type === "lecturers") {
      // Lecturer/admin only — students don't need the staff directory.
      if (ctx.role === "student") {
        return res
          .status(403)
          .json({ error: "Students cannot enumerate lecturers." });
      }
      const { data, error } = await supabase
        .from("lecturers")
        .select("id, name, email")
        .order("name");
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ lecturers: data || [] });
    }

    // ─── timetable ───────────────────────────────────────────────
    if (type === "timetable") {
      let query = supabase
        .from("timetable")
        .select(
          "id, batch, day, time, subject_id, subjects ( name, lecturer_id, lecturers ( name ) )"
        );
      if (ctx.role === "student") {
        if (!ctx.batch) {
          return res
            .status(400)
            .json({ error: "Student account has no batch assignment." });
        }
        query = query.eq("batch", ctx.batch);
      } else if (batch) {
        query = query.eq("batch", batch as string);
      }
      const { data, error } = await query.order("batch").order("day").order("time");
      if (error) return res.status(500).json({ error: error.message });
      const timetable = (data || []).map((t: any) => ({
        id: t.id,
        batch: t.batch,
        day: t.day,
        time: t.time,
        subjectId: t.subject_id,
        subjectName: t.subjects?.name ?? null,
        lecturerId: t.subjects?.lecturer_id ?? null,
        lecturerName: t.subjects?.lecturers?.name ?? null,
        isBreak: t.subject_id === "BREAK",
      }));
      return res.json({ timetable });
    }

    return res.status(400).json({ error: "Missing or invalid type param" });
  } catch (err: any) {
    console.error("[data] unhandled error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error." });
  }
}
