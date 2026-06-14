import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * User account creation and credential lookup. Keeps password hashing at the
 * boundary so routes never touch raw hashes.
 */

export type UserRecord = {
  id: number;
  email: string;
  name: string;
  role: string;
  password: string;
};

const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: string;
  company?: string | null;
}):
  | { ok: true; id: number; role: string }
  | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role === "recruiter" ? "recruiter" : "candidate";
  const company = input.company?.trim() || null;
  if (!email_pattern.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (name.length < 2) {
    return { ok: false, error: "Tell us your name." };
  }
  if (role === "recruiter" && !company) {
    return { ok: false, error: "Add the company you're hiring for." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Use a password of at least 8 characters." };
  }

  const existing = getDb()
    .prepare(`SELECT id FROM users WHERE email = ?`)
    .get(email);
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const result = getDb()
    .prepare(
      `INSERT INTO users (email, name, role, password, company) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(email, name, role, hashPassword(input.password), company);
  return { ok: true, id: Number(result.lastInsertRowid), role };
}

export function authenticateUser(
  email_input: string,
  password: string,
): { ok: true; id: number } | { ok: false; error: string } {
  const email = email_input.trim().toLowerCase();
  const user = getDb()
    .prepare(`SELECT id, password FROM users WHERE email = ?`)
    .get(email) as Pick<UserRecord, "id" | "password"> | undefined;
  if (!user || !verifyPassword(password, user.password)) {
    return { ok: false, error: "Email or password is incorrect." };
  }
  return { ok: true, id: user.id };
}
