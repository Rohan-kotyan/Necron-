import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

/**
 * Shared auth helper for timetable endpoints.
 *
 * The rest of the codebase does NOT verify JWTs — but the timetable module
 * was explicitly requested to enforce role-based access on the BACKEND as
 * well as the frontend. This helper is the single source of truth for that
 * enforcement.
 */

export type Role = "student" | "lecturer" | "admin";

export interface AuthContext {
  role: Role;
  userId: string;
  email: string;
  name: string;
  /** Present for students only */
  batch?: string;
  specialization?: string;
  registrationNumber?: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured on this deployment.");
  }
  return secret;
}

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns null on missing/invalid token (caller decides how to respond).
 */
export function readAuthContext(req: VercelRequest): AuthContext | null {
  const header = req.headers["authorization"] || req.headers["Authorization"];
  if (!header || typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const payload = jwt.verify(match[1], getJwtSecret()) as any;
    if (!payload || !payload.role || !payload.id) return null;
    return {
      role: payload.role as Role,
      userId: payload.id,
      email: payload.email,
      name: payload.name,
      batch: payload.batch,
      specialization: payload.specialization,
      registrationNumber: payload.registrationNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Require an authenticated session. Sends 401 JSON on failure.
 * Returns the AuthContext on success.
 */
export function requireAuth(req: VercelRequest, res: VercelResponse): AuthContext | null {
  const ctx = readAuthContext(req);
  if (!ctx) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  return ctx;
}

/**
 * Require an authenticated session with one of the allowed roles.
 * Sends 401 (no auth) or 403 (wrong role) JSON on failure.
 * Students are denied write access; lecturers and admins are allowed.
 */
export function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  allowed: Role[]
): AuthContext | null {
  const ctx = requireAuth(req, res);
  if (!ctx) return null;
  if (!allowed.includes(ctx.role)) {
    res.status(403).json({
      error: `Your role (${ctx.role}) is not permitted to perform this action.`,
    });
    return null;
  }
  return ctx;
}

/** Roles that may edit the timetable (used by all write endpoints). */
export const TIMETABLE_EDITOR_ROLES: Role[] = ["lecturer", "admin"];
