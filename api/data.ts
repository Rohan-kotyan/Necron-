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

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const ctx = requireAuth(req, res);
    if (!ctx) return;
    const { type, batch, specialization } = req.query;
    const supabase = getSupabase();

    if (type === "batches") {
      if (ctx.role === "student") return res.json({ batches: ctx.batch ? [ctx.batch] : [] });
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

    if (type === "students") {
      if (ctx.role === "student") return res.status(403).json({ error: "Students cannot enumerate the student roster." });
      let query = supabase.from("students").select("id, name, email, registration_number, batch, specialization");
      if (batch) query = query.eq("batch", batch as string);
      if (specialization) query = query.eq("specialization", specialization as string);
      const { data, error } = await query.order("name");
      if (error) return res.status(500).json({ error: error.message });
      const students = (data || []).map((s: any) => ({ id: s.id, name: s.name, email: s.email, registrationNumber: s.registration_number, batch: s.batch, specialization: s.specialization }));
      return res.json({ students });
    }

    if (type === "subjects") {
      let query = supabase.from("subjects").select("id, name, lecturer_id, lecturers ( name )");
      if (ctx.role === "student" && ctx.batch) {
        const { data: ttData } = await supabase.from("timetable").select("subject_id").eq("batch", ctx.batch);
        const subjectIds = Array.from(new Set((ttData || []).map((t: any) => t.subject_id).filter(Boolean)));
        if (subjectIds.length === 0) return res.json({ subjects: [] });
        query = query.in("id", subjectIds);
      }
      const { data, error } = await query.order("name");
      if (error) return res.status(500).json({ error: error.message });
      const subjects = (data || []).map((s: any) => ({ id: s.id, name: s.name, lecturerId: s.lecturer_id, lecturerName: s.lecturers?.name ?? null }));
      return res.json({ subjects });
    }

    if (type === "lecturers") {
      if (ctx.role === "student") return res.status(403).json({ error: "Students cannot enumerate lecturers." });
      const { data, error } = await supabase.from("lecturers").select("id, name, email").order("name");
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ lecturers: data || [] });
    }

    if (type === "timetable") {
      let query = supabase.from("timetable").select("id, batch, day, time, subject_id, subjects ( name, lecturer_id, lecturers ( name ) )");
      if (ctx.role === "student") {
        if (!ctx.batch) return res.status(400).json({ error: "Student account has no batch assignment." });
        query = query.eq("batch", ctx.batch);
      } else if (batch) {
        query = query.eq("batch", batch as string);
      }
      const { data, error } = await query.order("batch").order("day").order("time");
      if (error) return res.status(500).json({ error: error.message });
      const timetable = (data || []).map((t: any) => ({ id: t.id, batch: t.batch, day: t.day, time: t.time, subjectId: t.subject_id, subjectName: t.subjects?.name ?? null, lecturerId: t.subjects?.lecturer_id ?? null, lecturerName: t.subjects?.lecturers?.name ?? null, isBreak: t.subject_id === "BREAK" }));
      return res.json({ timetable });
    }

    return res.status(400).json({ error: "Missing or invalid type param" });
  } catch (err: any) { console.error("[data]", err); return res.status(500).json({ error: err?.message || "Internal server error." }); }
}
