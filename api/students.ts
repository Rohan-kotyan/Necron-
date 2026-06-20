import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { batch, specialization } = req.query;

  let query = supabase.from("students").select("id, name, email, registration_number, batch, specialization");

  if (batch) query = query.ilike("batch", batch as string);
  if (specialization) query = query.ilike("specialization", specialization as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Map snake_case to camelCase to match frontend expectations
  const students = (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    registrationNumber: s.registration_number,
    batch: s.batch,
    specialization: s.specialization,
  }));

  return res.json({ students });
}
