import bcrypt from "bcryptjs";

/**
 * Password hashing helpers.
 *
 * Previously the codebase stored passwords in plaintext and compared with
 * `===`. This module replaces that with bcrypt hashing.
 *
 * Hash format: bcrypt with 10 rounds (≈80ms per hash, acceptable for
 * serverless cold starts).
 */

const SALT_ROUNDS = 10;

export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(
  plaintext: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!plaintext || !hash) return false;
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}

/**
 * Constant-time comparison for legacy plaintext passwords (used during
 * the migration window — once `password` column is dropped, this can go).
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
