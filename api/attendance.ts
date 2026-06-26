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

function mapHistoryRow(a: any) {
  return { id: a.id, date: a.date, status: a.status, studentId: a.student_id, studentName: a.students?.name || "Unknown Student", registrationNumber: a.students?.registration_number || "Unknown", batch: a.students?.batch || "Unknown", specialization: a.students?.specialization || "N/A", subjectId: a.subject_id, subjectName: a.subjects?.name || "Unknown Subject", lecturerName: a.subjects?.lecturers?.name || "N/A" };
}

export default async function handler(req: any, res: any) {
  try {
    const ctx = requireAuth(req, res);
    if (!ctx) return;
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { type, id } = req.query;
      if (type === "history") {
        if (ctx.role === "student") return res.status(403).json({ error: "Students cannot view the full attendance history." });
        const { data, error } = await supabase.from("attendance").select(`id, date, status, student_id, subject_id, students ( name, registration_number, batch, specialization ), subjects ( name, lecturer_id, lecturers ( name ) )`).order("date", { ascending: false }).order("student_id").limit(2000);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ history: (data || []).map(mapHistoryRow) });
      }
      if (type === "student" && id) {
        const targetId = ctx.role === "student" ? ctx.userId : (id as string);
        if (ctx.role === "student" && targetId !== ctx.userId) return res.status(403).json({ error: "Students can only view their own attendance." });
        const { data, error } = await supabase.from("attendance").select("id, student_id, subject_id, date, status").eq("student_id", targetId).order("date", { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        const attendance = (data || []).map((a: any) => ({ id: a.id, studentId: a.student_id, subjectId: a.subject_id, date: a.date, status: a.status }));
        return res.json({ attendance });
      }
      return res.status(400).json({ error: "Missing type param" });
    }

    if (req.method === "POST") {
      const writeCtx = requireRole(req, res, ["lecturer", "admin"]);
      if (!writeCtx) return;
      const { subjectId, date, records } = req.body || {};
      if (!subjectId || !date || !Array.isArray(records) || records.length === 0) return res.status(400).json({ error: "Missing required fields: subjectId, date, records[]" });
      if (subjectId !== "BREAK") {
        const { data: subj } = await supabase.from("subjects").select("id").eq("id", subjectId).maybeSingle();
        if (!subj) return res.status(400).json({ error: `Subject ${subjectId} does not exist.` });
      }
      const cleanDate = String(date).split("T")[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return res.status(400).json({ error: `Invalid date format: ${cleanDate}` });
      const upsertRows = records.map((rec: { studentId: string; status: string }) => {
        if (!rec.studentId || !rec.status) throw new Error("Each record must have studentId and status.");
        if (rec.status !== "Present" && rec.status !== "Absent") throw new Error(`Invalid status: ${rec.status}`);
        return { id: `ATT_${rec.studentId}_${subjectId}_${cleanDate}`, student_id: rec.studentId, subject_id: subjectId, date: cleanDate, status: rec.status };
      });
      const { error } = await supabase.from("attendance").upsert(upsertRows, { onConflict: "student_id,subject_id,date" });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, message: "Attendance saved successfully!", count: upsertRows.length });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) { console.error("[attendance]", err); return res.status(500).json({ error: err?.message || "Internal server error." }); }
}
