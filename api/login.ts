import jwt from "jsonwebtoken";
import { getSupabase, getJwtSecret, hashPassword, verifyPassword, safeEqual, crypto } from "./_shared";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { email, password, role } = req.body || {};
    if (!email || !password || !role) return res.status(400).json({ error: "Missing fields" });

    const secret = getJwtSecret();
    const supabase = getSupabase();

    if (role === "admin") {
      const { data: admin, error } = await supabase
        .from("admins").select("id,name,email,password_hash")
        .eq("email", String(email).trim().toLowerCase()).maybeSingle();
      if (error || !admin) return res.status(401).json({ error: "Invalid admin credentials" });
      let ok = false;
      if (admin.password_hash) { try { ok = await verifyPassword(password, admin.password_hash); } catch { ok = false; } }
      if (!ok) return res.status(401).json({ error: "Invalid admin credentials" });
      const token = jwt.sign({ id: admin.id, email: admin.email, role: "admin", name: admin.name }, secret, { expiresIn: "1d" });
      return res.json({ token, user: { id: admin.id, email: admin.email, role: "admin", name: admin.name } });
    }

    if (role === "lecturer") {
      const { data: lec, error } = await supabase
        .from("lecturers").select("id,name,email,password_hash,password")
        .eq("email", String(email).trim().toLowerCase()).maybeSingle();
      if (error || !lec) return res.status(401).json({ error: "Invalid lecturer credentials" });
      let ok = false;
      if (lec.password_hash) {
        try { ok = await verifyPassword(password, lec.password_hash); } catch { ok = false; }
        if (!ok) {
          const legacyHash = crypto.createHmac("sha256", "veritas_legacy_migration_v1").update(password).digest("hex");
          if (legacyHash === lec.password_hash) {
            ok = true;
            const newHash = await hashPassword(password);
            await supabase.from("lecturers").update({ password_hash: newHash, password: null }).eq("id", lec.id);
          }
        }
      } else if (lec.password && safeEqual(password, lec.password)) {
        ok = true;
        const newHash = await hashPassword(password);
        await supabase.from("lecturers").update({ password_hash: newHash, password: null }).eq("id", lec.id);
      }
      if (!ok) return res.status(401).json({ error: "Invalid lecturer credentials" });
      const token = jwt.sign({ id: lec.id, email: lec.email, role: "lecturer", name: lec.name }, secret, { expiresIn: "1d" });
      return res.json({ token, user: { id: lec.id, email: lec.email, role: "lecturer", name: lec.name } });
    }

    if (role === "student") {
      const regNum = String(email).trim().toUpperCase();
      const { data: stu, error } = await supabase
        .from("students").select("id,name,email,registration_number,batch,specialization,password_hash,password")
        .eq("registration_number", regNum).maybeSingle();
      if (error || !stu) return res.status(401).json({ error: "Invalid student credentials" });
      let ok = false;
      if (stu.password_hash) {
        try { ok = await verifyPassword(password, stu.password_hash); } catch { ok = false; }
        if (!ok) {
          const legacyHash = crypto.createHmac("sha256", "veritas_legacy_migration_v1").update(password).digest("hex");
          if (legacyHash === stu.password_hash) {
            ok = true;
            const newHash = await hashPassword(password);
            await supabase.from("students").update({ password_hash: newHash, password: null }).eq("id", stu.id);
          }
        }
      } else if (stu.password && safeEqual(password, stu.password)) {
        ok = true;
        const newHash = await hashPassword(password);
        await supabase.from("students").update({ password_hash: newHash, password: null }).eq("id", stu.id);
      }
      if (!ok) return res.status(401).json({ error: "Invalid student credentials" });
      const token = jwt.sign({
        id: stu.id, email: stu.email, role: "student", name: stu.name,
        registrationNumber: stu.registration_number, batch: stu.batch, specialization: stu.specialization,
      }, secret, { expiresIn: "1d" });
      return res.json({
        token,
        user: {
          id: stu.id, email: stu.email, role: "student", name: stu.name,
          registrationNumber: stu.registration_number, batch: stu.batch, specialization: stu.specialization,
        },
      });
    }

    return res.status(400).json({ error: "Unsupported role" });
  } catch (err: any) {
    console.error("[login]", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
