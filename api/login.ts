import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ error: "Email, password and role are required" });

  if (role === "admin") {
    if (email === "admin@college.edu" && password === "password") {
      const token = jwt.sign(
        { id: "ADMIN", email, role: "admin", name: "System Administrator" },
        JWT_SECRET,
        { expiresIn: "1d" }
      );
      return res.json({ token, user: { id: "ADMIN", email, role: "admin", name: "System Administrator" } });
    }
    return res.status(401).json({ error: "Invalid Administration credentials" });
  }

  if (role === "lecturer") {
    const { data: lecturer } = await supabase
      .from("lecturers")
      .select("*")
      .ilike("email", email)
      .single();

    if (lecturer && lecturer.password === password) {
      const token = jwt.sign(
        { id: lecturer.id, email: lecturer.email, role: "lecturer", name: lecturer.name },
        JWT_SECRET,
        { expiresIn: "1d" }
      );
      return res.json({ token, user: { id: lecturer.id, email: lecturer.email, role: "lecturer", name: lecturer.name } });
    }
    return res.status(401).json({ error: "Invalid Lecturer credentials" });
  }

  if (role === "student") {
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .or(`email.ilike.${email},registration_number.ilike.${email}`)
      .single();

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
        JWT_SECRET,
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
}
