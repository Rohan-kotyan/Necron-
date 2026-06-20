import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/students        → add student
// DELETE /api/admin/students?id=X → delete student
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const { name, email, password, registrationNumber, batch, specialization } = req.body;
    if (!name || !email || !password || !registrationNumber || !batch || !specialization)
      return res.status(400).json({ error: "Please complete all student fields" });

    const { count } = await supabase.from("students").select("*", { count: "exact", head: true });
    const id = `STUD${String((count || 0) + 1).padStart(3, "0")}`;

    const { data, error } = await supabase
      .from("students")
      .insert({ id, name, email, password, registration_number: registrationNumber, batch, specialization })
      .select().single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({
      success: true,
      student: {
        id: data.id, name: data.name, email: data.email,
        registrationNumber: data.registration_number,
        batch: data.batch, specialization: data.specialization,
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
}
