import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";

export { hashPassword, verifyPassword } from "@/lib/password";

/**
 * Minimal credential auth for the prototype. Passwords are salted+hashed with
 * scrypt; sessions are stateless signed cookies carrying the user id. This is a
 * deliberate placeholder — Clerk replaces it later — but it is not insecure by
 * construction (no plaintext passwords, constant-time comparison, HMAC cookie).
 */

const session_cookie_name = "career_os_session";
const session_max_age_seconds = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  headline: string | null;
  location: string | null;
  company: string | null;
  skills: string[];
};

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-only-insecure-change-me";
}

function signSession(user_id: number): string {
  const payload = String(user_id);
  const signature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

function readSignedSession(token: string | undefined): number | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const user_id = Number(payload);
  return Number.isInteger(user_id) ? user_id : null;
}

export async function createSession(user_id: number): Promise<void> {
  const cookie_store = await cookies();
  cookie_store.set(session_cookie_name, signSession(user_id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session_max_age_seconds,
  });
}

export async function destroySession(): Promise<void> {
  const cookie_store = await cookies();
  cookie_store.delete(session_cookie_name);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookie_store = await cookies();
  const user_id = readSignedSession(
    cookie_store.get(session_cookie_name)?.value,
  );
  if (user_id === null) return null;

  const row = getDb()
    .prepare(
      `SELECT id, email, name, role, headline, location, company, skills FROM users WHERE id = ?`,
    )
    .get(user_id) as (Omit<SessionUser, "skills"> & { skills: string }) | undefined;
  if (!row) return null;
  return { ...row, skills: parseSkills(row.skills) };
}

function parseSkills(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Returns the current user only if they hold the required role; otherwise null.
 * Pages use this to enforce the candidate / recruiter split before rendering.
 */
export async function requireRole(role: "candidate" | "recruiter"): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user && user.role === role ? user : null;
}
