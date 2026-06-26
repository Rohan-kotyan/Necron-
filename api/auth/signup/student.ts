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

const VALID_BATCHES = ["A1", "A2", "A3", "A4"];
const VALID_SPECIALIZATIONS = ["AI & ML", "SD", "MV"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { name, email, password, registrationNumber, batch, specialization } = req.body || {};
    if (!name || !email || !password || !registrationNumber || !batch || !specialization) return res.status(400).json({ error: "All fields are required." });
    if (typeof name !== "string" || name.trim().length < 2) return res.status(400).json({ error: "Name must be at least 2 characters." });
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: "Invalid email address." });
    if (typeof password !== "string" || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters long." });
    if (!VALID_BATCHES.includes(batch)) return res.status(400).json({ error: `Invalid batch. Allowed: ${VALID_BATCHES.join(", ")}` });
    if (!VALID_SPECIALIZATIONS.includes(specialization)) return res.status(400).json({ error: `Invalid specialization. Allowed: ${VALID_SPECIALIZATIONS.join(", ")}` });
    const supabase = getSupabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedReg = String(registrationNumber).trim().toUpperCase();
    const { data: existingEmail } = await supabase.from("students").select("id").eq("email", normalizedEmail).maybeSingle();
    if (existingEmail) return res.status(409).json({ error: "An account with this email already exists." });
    const { data: existingReg } = await supabase.from("students").select("id").eq("registration_number", normalizedReg).maybeSingle();
    if (existingReg) return res.status(409).json({ error: "An account with this registration number already exists." });
    const id = await nextId("STUD", "students");
    const passwordHash = await hashPassword(password);
    const { data, error } = await supabase.from("students").insert({ id, name: name.trim(), email: normalizedEmail, password_hash: passwordHash, password: "", registration_number: normalizedReg, batch, specialization }).select("id, name, email, registration_number, batch, specialization").single();
    if (error) { console.error("[signup/student] insert error:", error.message); return res.status(500).json({ error: error.message || "Failed to create student account." }); }
    const token = jwt.sign({ id: data.id, email: data.email, role: "student", name: data.name, registrationNumber: data.registration_number, batch: data.batch, specialization: data.specialization }, getJwtSecret(), { expiresIn: "1d" });
    return res.status(201).json({ token, user: { id: data.id, email: data.email, role: "student" as const, name: data.name, registrationNumber: data.registration_number, batch: data.batch, specialization: data.specialization } });
  } catch (err: any) { console.error("[signup/student]", err); return res.status(500).json({ error: err?.message || "Failed to create account." }); }
}
