import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import {
  parseTimetableXlsx,
  seedTimetableFromParsed,
  type ParsedTimetable,
} from "../../_lib/timetable_parser";
import { DEFAULT_TIMETABLE_XLSX_BASE64 } from "../../_lib/default_timetable";

// Inlined shared helpers (Vercel Node 24 can't import from local modules)
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

/**
 * POST /api/admin/timetable/import
 *   Body: { mode: "default" | "upload" | "raw", buffer?: string (base64) }
 *
 *   mode = "default"  → uses the embedded A1-III Sem default Excel sheet
 *   mode = "upload"   → expects { buffer: "<base64>" } of an uploaded xlsx
 *   mode = "raw"      → same as upload, alternative name
 *
 *   Optional: { replaceAll: true } → wipes ALL timetable rows first (not just
 *   the affected batches). Default: false (only wipes batches present in the
 *   imported sheet — preserves other batches' entries).
 *
 *   Optional: { dryRun: true } → parses the file but does NOT write to DB.
 *   Returns the parsed structure for UI preview. Default: false.
 *
 * Returns:
 *   200 { success, mode, dryRun, parsed: { days, batches, timeSlots, subjects, lecturers, rowCount }, seeded?: {...} }
 *
 * Auth: lecturer or admin only.
 *
 * Also: students are blocked at the role check (403).
 */
async function readBody(req: any): Promise<Buffer> {
  // Vercel may stream the body or place it on req.body depending on content type.
  // We accept either a base64 string in JSON or a raw binary body.
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("application/json")) {
    const b64 = req.body?.buffer;
    if (typeof b64 !== "string" || !b64) {
      throw new Error("JSON body must include a base64 'buffer' field.");
    }
    return Buffer.from(b64, "base64");
  }
  // Raw binary body
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "base64");
  throw new Error("Unsupported request body. Send JSON {buffer} or raw xlsx bytes.");
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const ctx = requireRole(req, res, TIMETABLE_EDITOR_ROLES);
    if (!ctx) return;

    const mode: "default" | "upload" | "raw" = req.body?.mode || "default";
    const dryRun: boolean = !!req.body?.dryRun;
    const replaceAll: boolean = !!req.body?.replaceAll;

    let buffer: Buffer;
    if (mode === "default") {
      buffer = Buffer.from(DEFAULT_TIMETABLE_XLSX_BASE64, "base64");
    } else {
      try {
        buffer = await readBody(req);
      } catch (e: any) {
        return res.status(400).json({ error: e.message });
      }
    }

    // 1. Parse the Excel file.
    let parsed: ParsedTimetable;
    try {
      parsed = parseTimetableXlsx(buffer);
    } catch (e: any) {
      return res.status(400).json({
        error: `Could not parse Excel file: ${e.message}`,
      });
    }

    if (parsed.rows.length === 0) {
      return res.status(400).json({
        error: "Excel file contained no timetable rows.",
      });
    }

    // 2. If dryRun, return the parsed structure without writing.
    if (dryRun) {
      return res.json({
        success: true,
        mode,
        dryRun: true,
        parsed: {
          days: parsed.days,
          batches: parsed.batches,
          timeSlots: parsed.timeSlots,
          subjects: parsed.subjects,
          lecturers: parsed.lecturers,
          rowCount: parsed.rows.length,
          sampleRows: parsed.rows.slice(0, 12),
        },
      });
    }

    // 3. Optionally wipe ALL existing timetable rows.
    if (replaceAll) {
      const supabase = getSupabase();
      const { error } = await supabase.from("timetable").delete().neq("id", "__never__");
      if (error) {
        // Abort instead of warn-and-continue. Continuing would leave the DB
        // in an inconsistent state and the subsequent insert could fail in
        // confusing ways.
        return res.status(500).json({
          error: `Failed to wipe existing timetable rows: ${error.message}`,
        });
      }
    }

    // 4. Seed the DB.
    const seeded = await seedTimetableFromParsed(parsed);

    return res.json({
      success: true,
      mode,
      dryRun: false,
      parsed: {
        days: parsed.days,
        batches: parsed.batches,
        timeSlots: parsed.timeSlots,
        subjects: parsed.subjects,
        lecturers: parsed.lecturers,
        rowCount: parsed.rows.length,
      },
      seeded,
    });
  } catch (err: any) {
    console.error("[admin/timetable/import] unhandled error:", err);
    return res.status(500).json({
      error:
        err?.message ||
        "The timetable importer encountered an unexpected error.",
    });
  }
}
