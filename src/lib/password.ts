import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing primitives, isolated from any framework imports so they are
 * unit-testable in a plain Node environment. Uses scrypt with a per-password
 * salt and constant-time comparison.
 */

export function hashPassword(plain_text: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain_text, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(plain_text: string, stored: string): boolean {
  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;
  const candidate = scryptSync(plain_text, salt, 64);
  const expected = Buffer.from(derived, "hex");
  return (
    candidate.length === expected.length &&
    timingSafeEqual(candidate, expected)
  );
}
