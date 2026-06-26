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
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { token, newPassword, role } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required." });
    if (typeof newPassword !== "string" || newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters long." });
    const supabase = getSupabase();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { data: resetRow, error: lookupErr } = await supabase.from("password_resets").select("id, email, expires_at, used").eq("token_hash", tokenHash).maybeSingle();
    if (lookupErr || !resetRow) return res.status(400).json({ error: "Invalid or unknown reset token." });
    if (resetRow.used) return res.status(400).json({ error: "This reset token has already been used." });
    if (new Date(resetRow.expires_at).getTime() < Date.now()) return res.status(400).json({ error: "This reset token has expired." });
    await supabase.from("password_resets").update({ used: true }).eq("id", resetRow.id);
    const passwordHash = await hashPassword(newPassword);
    const email = resetRow.email;
    const rolesToTry: string[] = role ? [role] : ["student", "lecturer", "admin"];
    let updated = false;
    for (const r of rolesToTry) {
      const table = r === "student" ? "students" : r === "lecturer" ? "lecturers" : "admins";
      const { data, error } = await supabase.from(table).update({ password_hash: passwordHash, password: null }).eq("email", email).select("id");
      if (!error && data && data.length > 0) { updated = true; break; }
    }
    if (!updated) return res.status(404).json({ error: "Token was valid but no matching user account was found." });
    return res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err: any) { console.error("[reset-password]", err); return res.status(500).json({ error: err?.message || "Failed to reset password." }); }
}
