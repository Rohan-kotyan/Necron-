import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase, nextId } from "../../_db";
import { requireRole, TIMETABLE_EDITOR_ROLES, requireAuth } from "../../_auth";

/**
 * Timetable CRUD endpoint (role-enforced).
 *
 *  GET    /api/admin/timetable                → list ALL entries (auth: any role)
 *  GET    /api/admin/timetable?batch=A1       → filter by batch
 *  POST   /api/admin/timetable                → create entry (auth: lecturer, admin)
 *  PUT    /api/admin/timetable?id=TT001       → update entry (auth: lecturer, admin)
 *  DELETE /api/admin/timetable?id=TT001       → delete entry (auth: lecturer, admin)
 *
 *  POST   /api/admin/timetable  { type:"subject", name, lecturerId }
 *        → create subject (auth: lecturer, admin)
 *  POST   /api/admin/timetable  { type:"break", batch, day, time, label }
 *        → create a break-period entry that uses subject_id = "BREAK"
 *  POST   /api/admin/timetable  { type:"bulk", entries: [...] }
 *        → bulk insert (used by Excel importer)
 */

const VALID_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type Day = (typeof VALID_DAYS)[number];

function isDay(s: any): s is Day {
  return typeof s === "string" && (VALID_DAYS as readonly string[]).includes(s);
}

function mapRow(r: any) {
  return {
    id: r.id,
    batch: r.batch,
    day: r.day,
    time: r.time,
    subjectId: r.subject_id,
    /** Subject name (only present if the join returned it) */
    subjectName: r.subjects?.name ?? null,
    /** Lecturer id (only present if the join returned it) */
    lecturerId: r.subjects?.lecturer_id ?? null,
    /** Lecturer name (only present if the join returned it) */
    lecturerName: r.subjects?.lecturers?.name ?? null,
    /** Marker for break slots: subject_id === 'BREAK' */
    isBreak: r.subject_id === "BREAK",
  };
}

async function listEntries(req: VercelRequest, res: VercelResponse) {
  // Any authenticated role can read.
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
}

async function createEntry(req: VercelRequest, res: VercelResponse) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;

  const { batch, day, time, subjectId } = req.body || {};
  if (!batch || !isDay(day) || !time || !subjectId) {
    return res
      .status(400)
      .json({ error: "batch, day, time and subjectId are required." });
  }

  const supabase = getSupabase();

  // Validate subject exists (unless it's the special BREAK marker).
  if (subjectId !== "BREAK") {
    const { data: subj, error: subjErr } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .maybeSingle();
    if (subjErr) return res.status(500).json({ error: subjErr.message });
    if (!subj)
      return res
        .status(400)
        .json({ error: `Subject ${subjectId} does not exist.` });
  }

  const id = await nextId("TT", "timetable");
  const { data, error } = await supabase
    .from("timetable")
    .insert({ id, batch, day, time, subject_id: subjectId })
    .select(
      "id, batch, day, time, subject_id, subjects ( name, lecturer_id, lecturers ( name ) )"
    )
    .single();
  if (error) return res.status(400).json({ error: error.message });

  return res.status(201).json({ success: true, timetableEntry: mapRow(data) });
}

async function updateEntry(req: VercelRequest, res: VercelResponse) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;

  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "id query parameter required." });

  const { batch, day, time, subjectId } = req.body || {};
  const patch: Record<string, any> = {};
  if (batch !== undefined) patch.batch = batch;
  if (day !== undefined) {
    if (!isDay(day))
      return res.status(400).json({ error: `Invalid day: ${day}` });
    patch.day = day;
  }
  if (time !== undefined) patch.time = time;
  if (subjectId !== undefined) {
    if (subjectId !== "BREAK") {
      const supabase = getSupabase();
      const { data: subj } = await supabase
        .from("subjects")
        .select("id")
        .eq("id", subjectId)
        .maybeSingle();
      if (!subj)
        return res
          .status(400)
          .json({ error: `Subject ${subjectId} does not exist.` });
    }
    patch.subject_id = subjectId;
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "No fields to update." });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("timetable")
    .update(patch)
    .eq("id", id)
    .select(
      "id, batch, day, time, subject_id, subjects ( name, lecturer_id, lecturers ( name ) )"
    )
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Timetable entry not found." });

  return res.json({ success: true, timetableEntry: mapRow(data) });
}

async function deleteEntry(req: VercelRequest, res: VercelResponse) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;

  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "id query parameter required." });

  const supabase = getSupabase();
  const { error } = await supabase.from("timetable").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true, id });
}

async function createSubject(req: VercelRequest, res: VercelResponse) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;

  const { name, lecturerId } = req.body || {};
  if (!name || !lecturerId) {
    return res
      .status(400)
      .json({ error: "Subject name and lecturerId are required." });
  }

  const supabase = getSupabase();
  const { data: lect } = await supabase
    .from("lecturers")
    .select("id")
    .eq("id", lecturerId)
    .maybeSingle();
  if (!lect)
    return res
      .status(400)
      .json({ error: `Lecturer ${lecturerId} does not exist.` });

  const id = await nextId("SUB", "subjects");
  const { data, error } = await supabase
    .from("subjects")
    .insert({ id, name, lecturer_id: lecturerId })
    .select("id, name, lecturer_id")
    .single();
  if (error) return res.status(400).json({ error: error.message });

  return res
    .status(201)
    .json({
      success: true,
      subject: {
        id: data.id,
        name: data.name,
        lecturerId: data.lecturer_id,
      },
    });
}

async function bulkInsert(req: VercelRequest, res: VercelResponse) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;

  const { entries } = req.body || {};
  if (!Array.isArray(entries) || entries.length === 0) {
    return res
      .status(400)
      .json({ error: "entries[] is required and must not be empty." });
  }

  // Validate every entry before inserting any (atomic feel).
  for (const [i, e] of entries.entries()) {
    if (!e.batch || !isDay(e.day) || !e.time || !e.subjectId) {
      return res.status(400).json({
        error: `entries[${i}] is missing required fields (batch, day, time, subjectId).`,
      });
    }
  }

  const supabase = getSupabase();

  // Validate that all referenced subject_ids actually exist (unless BREAK).
  // The old bulkInsert skipped this check, so it inserted arbitrary IDs
  // and tripped FK errors with a confusing message.
  const subjectIds = Array.from(
    new Set(
      entries
        .map((e: any) => e.subjectId as string)
        .filter((id) => id && id !== "BREAK")
    )
  );
  if (subjectIds.length > 0) {
    const { data: found, error: subErr } = await supabase
      .from("subjects")
      .select("id")
      .in("id", subjectIds);
    if (subErr) return res.status(500).json({ error: subErr.message });
    const foundIds = new Set((found || []).map((s: any) => s.id));
    const missing = subjectIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Subject IDs do not exist: ${missing.join(", ")}. Create them first via type:"subject".`,
      });
    }
  }

  // Use the sequence-based nextId() for each row — eliminates the
  // count-based collision that the old bulkInsert had.
  const rows: { id: string; batch: string; day: string; time: string; subject_id: string }[] = [];
  for (const e of entries) {
    const id = await nextId("TT", "timetable");
    rows.push({
      id,
      batch: e.batch,
      day: e.day,
      time: e.time,
      subject_id: e.subjectId,
    });
  }

  const { data, error } = await supabase
    .from("timetable")
    .insert(rows)
    .select("id, batch, day, time, subject_id");
  if (error) return res.status(400).json({ error: error.message });

  return res.status(201).json({
    success: true,
    inserted: (data || []).length,
    timetable: (data || []).map((r) => ({
      id: r.id,
      batch: r.batch,
      day: r.day,
      time: r.time,
      subjectId: r.subject_id,
    })),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") return await listEntries(req, res);
    if (req.method === "POST") {
      const type = req.body?.type;
      if (type === "subject") return await createSubject(req, res);
      if (type === "bulk") return await bulkInsert(req, res);
      return await createEntry(req, res);
    }
    if (req.method === "PUT") return await updateEntry(req, res);
    if (req.method === "DELETE") return await deleteEntry(req, res);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[admin/timetable] unhandled error:", err);
    return res.status(500).json({
      error:
        err?.message ||
        "The timetable service encountered an unexpected error.",
    });
  }
}
