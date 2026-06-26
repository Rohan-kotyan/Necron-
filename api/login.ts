import jwt from "jsonwebtoken";
import { getSupabase } from "./_db";
import { getJwtSecret } from "./_auth";
import { verifyPassword, safeEqual } from "./_password";

/**
 * POST /api/login
 *   Body: { email, password, role: "student" | "lecturer" | "admin" }
 *
 * Returns: { token, user } on success; { error } on failure.
 *
 * Security notes:
 *   • No hardcoded admin — admin accounts live in the `admins` table with
 *     bcrypt-hashed passwords.
 *   • Login uses exact-match `.eq()` lookups, NOT `ilike` — the old `ilike`
 *     lookup allowed `%` wildcard injection that bypassed authentication
 *     when combined with the default `"password"` seeding.
 *   • Passwords are hashed (bcrypt); we never compare plaintext except as
 *     a one-time migration fallback for legacy rows.
 *   • On successful legacy-password login, the row is silently upgraded to
 *     a bcrypt hash so we never store plaintext again.
 */

function escapeForLog(s: string): string {
  return s.replace(/[\r\n]/g, "").slice(0, 100);
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ error: "Email, password and role are required" });
    }

    const jwtSecret = getJwtSecret();
    const supabase = getSupabase();
    const normalizedEmail = String(email).trim().toLowerCase();

    // ─── ADMIN LOGIN ───────────────────────────────────────────────
    if (role === "admin") {
      const { data: admin, error } = await supabase
        .from("admins")
        .select("id, name, email, password_hash")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (error) {
        console.error("[login] admin lookup error:", error.message);
        return res.status(401).json({ error: "Invalid administrator credentials" });
      }

      const ok = admin && await verifyPassword(password, admin.password_hash);
      if (!admin || !ok) {
        return res.status(401).json({ error: "Invalid administrator credentials" });
      }

      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: "admin", name: admin.name },
        jwtSecret,
        { expiresIn: "1d" }
      );
      return res.json({
        token,
        user: { id: admin.id, email: admin.email, role: "admin", name: admin.name },
      });
    }

    // ─── LECTURER LOGIN ────────────────────────────────────────────
    if (role === "lecturer") {
      const { data: lecturer, error } = await supabase
        .from("lecturers")
        .select("id, name, email, password_hash, password")
        .eq("email", normalizedEmail)   // EXACT match — no ilike wildcards
        .maybeSingle();

      if (error) {
        console.error("[login] lecturer lookup error:", error.message);
        return res.status(401).json({ error: "Invalid lecturer credentials" });
      }

      let ok = false;
      if (lecturer) {
        // Primary path: bcrypt hash
        if (lecturer.password_hash) {
          ok = await verifyPassword(password, lecturer.password_hash);
          if (!ok) {
            // Legacy SHA-256 HMAC migration path
            const crypto = await import("crypto");
            const legacyHash = crypto
              .createHmac("sha256", "veritas_legacy_migration_v1")
              .update(password)
              .digest("hex");
            if (legacyHash === lecturer.password_hash) {
              ok = true;
              const { hashPassword } = await import("./_password");
              const newHash = await hashPassword(password);
              await supabase
                .from("lecturers")
                .update({ password_hash: newHash, password: null })
                .eq("id", lecturer.id);
            }
          }
        }
        // Older legacy: plaintext password column
        else if (lecturer.password && safeEqual(password, lecturer.password)) {
          ok = true;
          const { hashPassword } = await import("./_password");
          const newHash = await hashPassword(password);
          await supabase
            .from("lecturers")
            .update({ password_hash: newHash, password: null })
            .eq("id", lecturer.id);
        }
      }

      if (!lecturer || !ok) {
        return res.status(401).json({ error: "Invalid lecturer credentials" });
      }

      const token = jwt.sign(
        { id: lecturer.id, email: lecturer.email, role: "lecturer", name: lecturer.name },
        jwtSecret,
        { expiresIn: "1d" }
      );
      return res.json({
        token,
        user: { id: lecturer.id, email: lecturer.email, role: "lecturer", name: lecturer.name },
      });
    }

    // ─── STUDENT LOGIN ─────────────────────────────────────────────
    if (role === "student") {
      // Students log in with their REGISTRATION NUMBER only (not email).
      // Email is stored in Supabase for record-keeping but is NOT used for login.
      // Use exact `.eq()` lookup — never ilike (wildcard injection).
      const regNum = String(email).trim().toUpperCase();
      const { data: student, error } = await supabase
        .from("students")
        .select("id, name, email, registration_number, batch, specialization, password_hash, password")
        .eq("registration_number", regNum)
        .maybeSingle();

      if (error) {
        console.error("[login] student lookup error:", error.message);
        return res.status(401).json({ error: "Invalid student credentials" });
      }

      let ok = false;
      if (student) {
        if (student.password_hash) {
          // Try bcrypt first (the new format)
          ok = await verifyPassword(password, student.password_hash);
          if (!ok) {
            // Try the legacy SHA-256 HMAC format (from the SQL migration)
            // migrate_legacy_passwords.sql stored:
            //   encode(hmac(password, 'veritas_legacy_migration_v1', 'sha256'), 'hex')
            const crypto = await import("crypto");
            const legacyHash = crypto
              .createHmac("sha256", "veritas_legacy_migration_v1")
              .update(password)
              .digest("hex");
            if (legacyHash === student.password_hash) {
              ok = true;
              // Upgrade to bcrypt immediately
              const { hashPassword } = await import("./_password");
              const newHash = await hashPassword(password);
              await supabase
                .from("students")
                .update({ password_hash: newHash, password: null })
                .eq("id", student.id);
            }
          }
        } else if (student.password && safeEqual(password, student.password)) {
          // Even older legacy: plaintext password column
          ok = true;
          const { hashPassword } = await import("./_password");
          const newHash = await hashPassword(password);
          await supabase
            .from("students")
            .update({ password_hash: newHash, password: null })
            .eq("id", student.id);
        }
      }

      if (!student || !ok) {
        return res.status(401).json({ error: "Invalid student credentials" });
      }

      const token = jwt.sign(
        {
          id: student.id,
          email: student.email,
          role: "student",
          name: student.name,
          registrationNumber: student.registration_number,
          batch: student.batch,
          specialization: student.specialization,
        },
        jwtSecret,
        { expiresIn: "1d" }
      );
      return res.json({
        token,
        user: {
          id: student.id,
          email: student.email,
          role: "student",
          name: student.name,
          registrationNumber: student.registration_number,
          batch: student.batch,
          specialization: student.specialization,
        },
      });
    }

    return res.status(400).json({ error: "Unsupported user role" });
  } catch (err: any) {
    console.error("[login] unhandled error:", err);
    return res.status(500).json({
      error:
        err?.message ||
        "The login service encountered an unexpected error. Please try again.",
    });
  }
}
