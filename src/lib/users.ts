import { supabase } from "@/lib/db";
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

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: string;
  company?: string | null;
}): Promise<
  { ok: true; id: number; role: string } | { ok: false; error: string }
> {
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

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      email,
      name,
      role,
      password: hashPassword(input.password),
      company,
    })
    .select("id, role")
    .single();

  if (error || !data) {
    return { ok: false, error: "Could not create account." };
  }

  return { ok: true, id: data.id, role: data.role as string };
}

export async function authenticateUser(
  email_input: string,
  password: string,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const email = email_input.trim().toLowerCase();
  const { data: user } = await supabase
    .from("users")
    .select("id, password")
    .eq("email", email)
    .maybeSingle();

  if (!user || !verifyPassword(password, user.password as string)) {
    return { ok: false, error: "Email or password is incorrect." };
  }
  return { ok: true, id: user.id };
}
