import jwt from "jsonwebtoken";

export type Role = "student" | "lecturer" | "admin";

export interface AuthContext {
  role: Role;
  userId: string;
  email: string;
  name: string;
  batch?: string;
  specialization?: string;
  registrationNumber?: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is not configured or is too short.");
  }
  return secret;
}

export function readAuthContext(req: any): AuthContext | null {
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

export function requireAuth(req: any, res: any): AuthContext | null {
  const ctx = readAuthContext(req);
  if (!ctx) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  return ctx;
}

export function requireRole(req: any, res: any, allowed: Role[]): AuthContext | null {
  const ctx = requireAuth(req, res);
  if (!ctx) return null;
  if (!allowed.includes(ctx.role)) {
    res.status(403).json({ error: `Your role (${ctx.role}) is not permitted.` });
    return null;
  }
  return ctx;
}

export const TIMETABLE_EDITOR_ROLES: Role[] = ["lecturer", "admin"];
export const ADMIN_ROLES: Role[] = ["admin"];
