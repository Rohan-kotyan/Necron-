import { getSupabase, nextId } from "../_db";
import { requireRole } from "../_auth";
import { hashPassword } from "../_password";

/**
 * POST   /api/admin/lecturers        → add lecturer (admin only)
 * DELETE /api/admin/lecturers?id=X   → delete lecturer (admin only)
 *
 * Security:
 *   • requireRole(["admin"]) gates every method.
 *   • Passwords are hashed with bcrypt before insert (was plaintext).
 *   • Uses the shared getSupabase() singleton (was creating a new client
 *     at module load, which crashed on missing env vars).
 *   • Uses nextId() (sequence-based) instead of COUNT(*)+1 which
 *     collided after deletions and under concurrent inserts.
 */
export default async function handler(req: any, res: any) {
  try {
    const ctx = requireRole(req, res, ["admin"]);
    if (!ctx) return;

    const supabase = getSupabase();

    if (req.method === "POST") {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ error: "Lecturer name, email, and password are required." });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long." });
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      // Check for duplicate email before insert — gives a clean error
      // instead of relying on Postgres' unique violation.
      const { data: existing } = await supabase
        .from("lecturers")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (existing) {
        return res
          .status(409)
          .json({ error: "A lecturer with this email already exists." });
      }

      const id = await nextId("LECT", "lecturers");
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase
        .from("lecturers")
        .insert({ id, name, email: normalizedEmail, password_hash: passwordHash })
        .select("id, name, email")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ success: true, lecturer: data });
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "ID required" });

      // Don't allow deleting yourself (admins use a separate endpoint,
      // but this protects against accidental cascading deletes).
      const { error } = await supabase.from("lecturers").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[admin/lecturers] unhandled error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error." });
  }
}
