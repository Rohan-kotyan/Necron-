import jwt from "jsonwebtoken";

/**
 * Shared auth helpers for ALL endpoints.
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

// Use minimal inline types instead of importing from @vercel/node.
// This avoids any bundler issues with the @vercel/node type import.
interface MinimalRequest {
  headers: Record<string, string | string[] | undefined>;
}
interface MinimalResponse {
  status(code: number): MinimalResponse;
  json(body: any): void;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is not configured or is too short (need at least 16 chars)."
    );
  }
  return secret;
}

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns null on missing/invalid token (caller decides how to respond).
 */
export function readAuthContext(req: MinimalRequest): AuthContext | null {
  const header = req.headers["authorization"];
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
export function requireAuth(req: MinimalRequest, res: MinimalResponse): AuthContext | null {
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
 */
export function requireRole(
  req: MinimalRequest,
  res: MinimalResponse,
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

/** Roles with admin-level access. */
export const ADMIN_ROLES: Role[] = ["admin"];
