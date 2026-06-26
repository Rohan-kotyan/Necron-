import { getSupabase, nextId } from "../_db";
import { requireRole } from "../_auth";
import { hashPassword } from "../_password";

/**
 * POST   /api/admin/students        → add student (admin only)
 * DELETE /api/admin/students?id=X   → delete student (admin only)
 *
 * Security & correctness fixes:
 *   • requireRole(["admin"]) gates every method.
 *   • Passwords are hashed with bcrypt before insert (was plaintext).
 *   • Uses the shared getSupabase() singleton (was creating a new client
 *     at module load, which crashed on missing env vars).
 *   • Uses nextId() (sequence-based) instead of COUNT(*)+1 which
 *     collided after deletions and under concurrent inserts.
 *   • Checks duplicate email AND registration_number before insert.
 */
export default async function handler(req: any, res: any) {
  try {
    const ctx = requireRole(req, res, ["admin"]);
    if (!ctx) return;

    const supabase = getSupabase();

    if (req.method === "POST") {
      const { name, email, password, registrationNumber, batch, specialization } =
        req.body || {};
      if (!name || !email || !password || !registrationNumber || !batch || !specialization) {
        return res
          .status(400)
          .json({ error: "Please complete all student fields." });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long." });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedReg = String(registrationNumber).trim().toUpperCase();

      // Duplicate email check
      const { data: existingEmail } = await supabase
        .from("students")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (existingEmail) {
        return res.status(409).json({ error: "Email already registered." });
      }

      // Duplicate registration_number check
      const { data: existingReg } = await supabase
        .from("students")
        .select("id")
        .eq("registration_number", normalizedReg)
        .maybeSingle();
      if (existingReg) {
        return res
          .status(409)
          .json({ error: "Registration number already in use." });
      }

      const id = await nextId("STUD", "students");
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase
        .from("students")
        .insert({
          id,
          name,
          email: normalizedEmail,
          password_hash: passwordHash,
          registration_number: normalizedReg,
          batch,
          specialization,
        })
        .select("id, name, email, registration_number, batch, specialization")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({
        success: true,
        student: {
          id: data.id,
          name: data.name,
          email: data.email,
          registrationNumber: data.registration_number,
          batch: data.batch,
          specialization: data.specialization,
        },
      });
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "ID required" });
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[admin/students] unhandled error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error." });
  }
}
