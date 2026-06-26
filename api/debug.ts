import { verifyPassword, safeEqual } from "./_password";

export default async function handler(req: any, res: any) {
  try {
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
