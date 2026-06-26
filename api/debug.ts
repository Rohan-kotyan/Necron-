import { getSupabase } from "./_db";
import { getJwtSecret } from "./_auth";
import { verifyPassword } from "./_password";
import jwt from "jsonwebtoken";

export default async function handler(req: any, res: any) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("students")
      .select("id, registration_number, password_hash")
      .eq("registration_number", "03SU25ML001")
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Student not found" });
    
    // Try legacy SHA-256 verification
    const crypto = await import("crypto");
    const legacyHash = crypto.createHmac("sha256", "veritas_legacy_migration_v1").update("password").digest("hex");
    const matchesLegacy = legacyHash === data.password_hash;
    
    // Try bcrypt
    const matchesBcrypt = await verifyPassword("password", data.password_hash);
    
    return res.status(200).json({
      ok: true,
      studentId: data.id,
      regNum: data.registration_number,
      hashPrefix: data.password_hash?.slice(0, 20),
      hashLen: data.password_hash?.length,
      matchesLegacy,
      matchesBcrypt,
      expectedLegacy: legacyHash.slice(0, 20),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack?.split("\n").slice(0, 5) });
  }
}
