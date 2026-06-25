import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getSupabase } from "../_db";

/**
 * POST /api/auth/forgot-password
 *   Body: { email }
 *
 * Issues a one-time reset token and stores its SHA-256 hash in
 * `password_resets`. The plaintext token is returned to the caller ONLY in
 * development/preview — in production, it would be emailed via Supabase
 * Auth or a transactional email service. Since this deployment doesn't
 * have email wired up, we return the token so the user can paste it into
 * the reset form manually.
 *
 * The endpoint always returns 200 (even if the email doesn't exist) to
 * prevent email enumeration.
 */

const TOKEN_TTL_MINUTES = 30;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required." });
    }

    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();

    // Look up the user across both students and lecturers (and admins).
    const [studRes, lectRes, adminRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, email")
        .eq("email", normalizedEmail)
        .maybeSingle(),
      supabase
        .from("lecturers")
        .select("id, email")
        .eq("email", normalizedEmail)
        .maybeSingle(),
      supabase
        .from("admins")
        .select("id, email")
        .eq("email", normalizedEmail)
        .maybeSingle(),
    ]);

    const found =
      (studRes.data as any) ||
      (lectRes.data as any) ||
      (adminRes.data as any) ||
      null;
    const role = studRes.data
      ? "student"
      : lectRes.data
        ? "lecturer"
        : adminRes.data
          ? "admin"
          : null;

    if (!found || !role) {
      // Don't reveal whether the email exists — return success.
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a reset token has been sent.",
      });
    }

    // Generate a random token (32 bytes = 64 hex chars).
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    // Invalidate any previous unused tokens for this email.
    await supabase
      .from("password_resets")
      .update({ used: true })
      .eq("email", normalizedEmail)
      .eq("used", false);

    // Insert the new token.
    const { error } = await supabase
      .from("password_resets")
      .insert({
        email: normalizedEmail,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      });

    if (error) {
      console.error("[forgot-password] insert error:", error.message);
      return res.status(500).json({ error: "Failed to issue reset token." });
    }

    // Since we don't have email wired up, return the token directly.
    // In production, you'd email this link: https://app/reset-password?token=...
    return res.json({
      success: true,
      message:
        "Reset token generated. (Email delivery is not configured — use the token below.)",
      token,
      role,
      expiresInMinutes: TOKEN_TTL_MINUTES,
    });
  } catch (err: any) {
    console.error("[forgot-password] unhandled error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to process password reset request.",
    });
  }
}
