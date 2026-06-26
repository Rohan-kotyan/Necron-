import crypto from "crypto";
import { getSupabase } from "../_db";
import { hashPassword } from "../_password";

/**
 * POST /api/auth/reset-password
 *   Body: { token, newPassword, role? }
 *
 * Validates the reset token (SHA-256 hash match, not expired, not used),
 * then updates the password_hash on the matching user row.
 *
 * The token is single-use — it's marked `used = true` after a successful
 * reset, regardless of whether the password update succeeded.
 */

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { token, newPassword, role } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required." });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long." });
    }

    const supabase = getSupabase();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Look up the token.
    const { data: resetRow, error: lookupErr } = await supabase
      .from("password_resets")
      .select("id, email, expires_at, used")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (lookupErr || !resetRow) {
      return res.status(400).json({ error: "Invalid or unknown reset token." });
    }
    if (resetRow.used) {
      return res.status(400).json({ error: "This reset token has already been used." });
    }
    if (new Date(resetRow.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "This reset token has expired." });
    }

    // Mark as used immediately (single-use).
    await supabase
      .from("password_resets")
      .update({ used: true })
      .eq("id", resetRow.id);

    // Hash the new password.
    const passwordHash = await hashPassword(newPassword);
    const email = resetRow.email;

    // Update the password on whichever table the user lives in.
    // If `role` was provided, use it; otherwise try all three.
    const rolesToTry: string[] = role ? [role] : ["student", "lecturer", "admin"];
    let updated = false;

    for (const r of rolesToTry) {
      const table =
        r === "student" ? "students" : r === "lecturer" ? "lecturers" : "admins";
      const { data, error } = await supabase
        .from(table)
        .update({ password_hash: passwordHash, password: null })
        .eq("email", email)
        .select("id");
      if (!error && data && data.length > 0) {
        updated = true;
        break;
      }
    }

    if (!updated) {
      return res.status(404).json({
        error: "Token was valid but no matching user account was found.",
      });
    }

    return res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (err: any) {
    console.error("[reset-password] unhandled error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to reset password.",
    });
  }
}
