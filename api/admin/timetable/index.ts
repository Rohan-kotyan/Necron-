import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ─── Shared helpers (inlined to avoid Vercel Node 24 local-module import bug) ───
let _supabase: any = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  _supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _supabase;
}
function getJwtSecret() { const s = process.env.JWT_SECRET; if (!s || s.length < 16) throw new Error("JWT_SECRET missing"); return s; }
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

async function nextId(prefix: string, table: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("next_sequential_id", { p_prefix: prefix, p_table: table });
  if (error || !data) {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase().slice(-6);
    return prefix + ts + rand;
  }
  return String(data);
}

async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 6) throw new Error("Password too short");
  return bcrypt.hash(plaintext, 10);
}

async function verifyPassword(plaintext: string, hash: string | null | undefined): Promise<boolean> {
  if (!plaintext || !hash) return false;
  try { return await bcrypt.compare(plaintext, hash); } catch { return false; }
}

type Role = "student" | "lecturer" | "admin";
interface AuthContext { role: Role; userId: string; email: string; name: string; batch?: string; specialization?: string; registrationNumber?: string; }

function readAuthContext(req: any): AuthContext | null {
  const header = req.headers["authorization"];
  if (!header || typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const payload = jwt.verify(match[1], getJwtSecret()) as any;
    if (!payload || !payload.role || !payload.id) return null;
    return { role: payload.role as Role, userId: payload.id, email: payload.email, name: payload.name, batch: payload.batch, specialization: payload.specialization, registrationNumber: payload.registrationNumber };
  } catch { return null; }
}
function requireAuth(req: any, res: any): AuthContext | null {
  const ctx = readAuthContext(req);
  if (!ctx) { res.status(401).json({ error: "Authentication required." }); return null; }
  return ctx;
}
function requireRole(req: any, res: any, allowed: Role[]): AuthContext | null {
  const ctx = requireAuth(req, res);
  if (!ctx) return null;
  if (!allowed.includes(ctx.role)) { res.status(403).json({ error: `Role ${ctx.role} not permitted.` }); return null; }
  return ctx;
}
const TIMETABLE_EDITOR_ROLES: Role[] = ["lecturer", "admin"];

const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type Day = (typeof VALID_DAYS)[number];
function isDay(s: any): s is Day { return typeof s === "string" && (VALID_DAYS as readonly string[]).includes(s); }
function mapRow(r: any) {
  return { id: r.id, batch: r.batch, day: r.day, time: r.time, subjectId: r.subject_id, subjectName: r.subjects?.name ?? null, lecturerId: r.subjects?.lecturer_id ?? null, lecturerName: r.subjects?.lecturers?.name ?? null, isBreak: r.subject_id === "BREAK" };
}

async function listEntries(req: any, res: any) {
  const ctx = requireAuth(req, res);
  if (!ctx) return;
  const supabase = getSupabase();
  let query = supabase.from("timetable").select("id, batch, day, time, subject_id, subjects ( name, lecturer_id, lecturers ( name ) )");
  if (ctx.role === "student") {
    if (!ctx.batch) return res.status(400).json({ error: "Student account has no batch assignment." });
    query = query.eq("batch", ctx.batch);
  } else {
    const batch = req.query.batch as string | undefined;
    if (batch) query = query.eq("batch", batch);
  }
  const { data, error } = await query.order("batch").order("day").order("time");
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ timetable: (data || []).map(mapRow) });
}

async function createEntry(req: any, res: any) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;
  const { batch, day, time, subjectId } = req.body || {};
  if (!batch || !isDay(day) || !time || !subjectId) return res.status(400).json({ error: "batch, day, time and subjectId are required." });
  const supabase = getSupabase();
  if (subjectId !== "BREAK") {
    const { data: subj, error: subjErr } = await supabase.from("subjects").select("id").eq("id", subjectId).maybeSingle();
    if (subjErr) return res.status(500).json({ error: subjErr.message });
    if (!subj) return res.status(400).json({ error: `Subject ${subjectId} does not exist.` });
  }
  const id = await nextId("TT", "timetable");
  const { data, error } = await supabase.from("timetable").insert({ id, batch, day, time, subject_id: subjectId }).select("id, batch, day, time, subject_id, subjects ( name, lecturer_id, lecturers ( name ) )").single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ success: true, timetableEntry: mapRow(data) });
}

async function updateEntry(req: any, res: any) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;
  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "id query parameter required." });
  const { batch, day, time, subjectId } = req.body || {};
  const patch: Record<string, any> = {};
  if (batch !== undefined) patch.batch = batch;
  if (day !== undefined) { if (!isDay(day)) return res.status(400).json({ error: `Invalid day: ${day}` }); patch.day = day; }
  if (time !== undefined) patch.time = time;
  if (subjectId !== undefined) {
    if (subjectId !== "BREAK") {
      const supabase = getSupabase();
      const { data: subj } = await supabase.from("subjects").select("id").eq("id", subjectId).maybeSingle();
      if (!subj) return res.status(400).json({ error: `Subject ${subjectId} does not exist.` });
    }
    patch.subject_id = subjectId;
  }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "No fields to update." });
  const supabase = getSupabase();
  const { data, error } = await supabase.from("timetable").update(patch).eq("id", id).select("id, batch, day, time, subject_id, subjects ( name, lecturer_id, lecturers ( name ) )").single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Timetable entry not found." });
  return res.json({ success: true, timetableEntry: mapRow(data) });
}

async function deleteEntry(req: any, res: any) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;
  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "id query parameter required." });
  const supabase = getSupabase();
  const { error } = await supabase.from("timetable").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, id });
}

async function createSubject(req: any, res: any) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;
  const { name, lecturerId } = req.body || {};
  if (!name || !lecturerId) return res.status(400).json({ error: "Subject name and lecturerId are required." });
  const supabase = getSupabase();
  const { data: lect } = await supabase.from("lecturers").select("id").eq("id", lecturerId).maybeSingle();
  if (!lect) return res.status(400).json({ error: `Lecturer ${lecturerId} does not exist.` });
  const id = await nextId("SUB", "subjects");
  const { data, error } = await supabase.from("subjects").insert({ id, name, lecturer_id: lecturerId }).select("id, name, lecturer_id").single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ success: true, subject: { id: data.id, name: data.name, lecturerId: data.lecturer_id } });
}

async function bulkInsert(req: any, res: any) {
  const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
  if (!ctx) return;
  const { entries } = req.body || {};
  if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: "entries[] is required and must not be empty." });
  for (const [i, e] of entries.entries()) {
    if (!e.batch || !isDay(e.day) || !e.time || !e.subjectId) return res.status(400).json({ error: `entries[${i}] is missing required fields.` });
  }
  const supabase = getSupabase();
  const subjectIds = Array.from(new Set(entries.map((e: any) => e.subjectId as string).filter((id) => id && id !== "BREAK")));
  if (subjectIds.length > 0) {
    const { data: found, error: subErr } = await supabase.from("subjects").select("id").in("id", subjectIds);
    if (subErr) return res.status(500).json({ error: subErr.message });
    const foundIds = new Set((found || []).map((s: any) => s.id));
    const missing = subjectIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) return res.status(400).json({ error: `Subject IDs do not exist: ${missing.join(", ")}.` });
  }
  const rows: { id: string; batch: string; day: string; time: string; subject_id: string }[] = [];
  for (const e of entries) {
    const id = await nextId("TT", "timetable");
    rows.push({ id, batch: e.batch, day: e.day, time: e.time, subject_id: e.subjectId });
  }
  const { data, error } = await supabase.from("timetable").insert(rows).select("id, batch, day, time, subject_id");
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ success: true, inserted: (data || []).length, timetable: (data || []).map((r: any) => ({ id: r.id, batch: r.batch, day: r.day, time: r.time, subjectId: r.subject_id })) });
}

export default async function handler(req: any, res: any) {
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
  } catch (err: any) { console.error("[admin/timetable]", err); return res.status(500).json({ error: err?.message || "Internal server error." }); }
}
