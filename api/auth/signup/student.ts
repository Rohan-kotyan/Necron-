import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase, nextId } from "../../_db";
import { getJwtSecret } from "../../_auth";
import { hashPassword } from "../../_password";
import jwt from "jsonwebtoken";

/**
 * POST /api/auth/signup/student
 *   Body: { name, email, password, registrationNumber, batch, specialization }
 *
 * Student self-signup endpoint. The LoginPortal UI was previously calling
 * this endpoint but it didn't exist — signup always 404'd. This implementation:
 *
 *   • Validates all required fields.
 *   • Enforces password length (>= 6 chars).
 *   • Validates email format.
 *   • Checks duplicate email AND registration_number before insert.
 *   • Hashes the password with bcrypt (never plaintext).
 *   • Returns the same { token, user } shape as /api/login so the UI can
 *     auto-login the new student.
 *
 * No auth required — this is a public signup endpoint. Rate limiting should
 * be added at the edge (Vercel) to prevent abuse.
 */

const VALID_BATCHES = ["A1", "A2", "A3", "A4"];
const VALID_SPECIALIZATIONS = ["AI & ML", "SD", "MV"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { name, email, password, registrationNumber, batch, specialization } =
      req.body || {};

    // ─── Validate ─────────────────────────────────────────────────
    if (!name || !email || !password || !registrationNumber || !batch || !specialization) {
      return res
        .status(400)
        .json({ error: "All fields are required: name, email, password, registrationNumber, batch, specialization." });
    }
    if (typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters." });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (!VALID_BATCHES.includes(batch)) {
      return res.status(400).json({ error: `Invalid batch. Allowed: ${VALID_BATCHES.join(", ")}` });
    }
    if (!VALID_SPECIALIZATIONS.includes(specialization)) {
      return res.status(400).json({ error: `Invalid specialization. Allowed: ${VALID_SPECIALIZATIONS.join(", ")}` });
    }

    const supabase = getSupabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedReg = String(registrationNumber).trim().toUpperCase();

    // ─── Duplicate checks ─────────────────────────────────────────
    const { data: existingEmail } = await supabase
      .from("students")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (existingEmail) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const { data: existingReg } = await supabase
      .from("students")
      .select("id")
      .eq("registration_number", normalizedReg)
      .maybeSingle();
    if (existingReg) {
      return res.status(409).json({ error: "An account with this registration number already exists." });
    }

    // ─── Insert ───────────────────────────────────────────────────
    const id = await nextId("STUD", "students");
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from("students")
      .insert({
        id,
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        registration_number: normalizedReg,
        batch,
        specialization,
      })
      .select("id, name, email, registration_number, batch, specialization")
      .single();

    if (error) {
      console.error("[signup/student] insert error:", error.message);
      return res.status(500).json({ error: "Failed to create student account." });
    }

    // ─── Auto-login (issue JWT) ───────────────────────────────────
    const token = jwt.sign(
      {
        id: data.id,
        email: data.email,
        role: "student",
        name: data.name,
        registrationNumber: data.registration_number,
        batch: data.batch,
        specialization: data.specialization,
      },
      getJwtSecret(),
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      token,
      user: {
        id: data.id,
        email: data.email,
        role: "student" as const,
        name: data.name,
        registrationNumber: data.registration_number,
        batch: data.batch,
        specialization: data.specialization,
      },
    });
  } catch (err: any) {
    console.error("[signup/student] unhandled error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to create account. Please try again.",
    });
  }
}
