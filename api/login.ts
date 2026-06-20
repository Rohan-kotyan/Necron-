import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

// Lazily initialize Supabase/JWT so the module still loads if env vars are
// missing (e.g. on a preview deployment without secrets). The handler will
// return a clean 500 JSON instead of crashing on import.
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured on this deployment.");
  }
  _supabase = createClient(url, key);
  return _supabase;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured on this deployment.");
  return secret;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always send JSON, even on configuration errors — prevents the client
  // "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
  // error when Vercel returns an empty body for unhandled exceptions.
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password and role are required" });
    }

    const jwtSecret = getJwtSecret();

    if (role === "admin") {
      if (email === "admin@college.edu" && password === "password") {
        const token = jwt.sign(
          { id: "ADMIN", email, role: "admin", name: "System Administrator" },
          jwtSecret,
          { expiresIn: "1d" }
        );
        return res.json({ token, user: { id: "ADMIN", email, role: "admin", name: "System Administrator" } });
      }
      return res.status(401).json({ error: "Invalid Administration credentials" });
    }

    if (role === "lecturer") {
      const supabase = getSupabase();
      const result: any = await supabase
        .from("lecturers")
        .select("*")
        .ilike("email", email)
        .single();
      const lecturer: any = result.data;
      const error = result.error;

      if (error) {
        // .single() throws when 0 or >1 rows match — log for visibility, but
        // continue to the credential check below (lecturer will be null).
        console.warn("[login] lecturer lookup failed:", error.message);
      }

      if (lecturer && lecturer.password === password) {
        const token = jwt.sign(
          { id: lecturer.id, email: lecturer.email, role: "lecturer", name: lecturer.name },
          jwtSecret,
          { expiresIn: "1d" }
        );
        return res.json({ token, user: { id: lecturer.id, email: lecturer.email, role: "lecturer", name: lecturer.name } });
      }
      return res.status(401).json({ error: "Invalid Lecturer credentials" });
    }

    if (role === "student") {
      const supabase = getSupabase();
      const result: any = await supabase
        .from("students")
        .select("*")
        .or(`email.ilike.${email},registration_number.ilike.${email}`)
        .single();
      const student: any = result.data;
      const error = result.error;

      if (error) {
        console.warn("[login] student lookup failed:", error.message);
      }

      if (student && student.password === password) {
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
      return res.status(401).json({ error: "Invalid Student credentials" });
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
