"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { authenticateUser, createUser } from "@/lib/users";

/**
 * Server actions backing the auth forms. Each returns a `{ error }` shape on
 * failure (consumed by `useActionState`) and redirects to the role's home on
 * success. Redirects throw by design, so they sit outside the try path.
 */

export type AuthState = { error: string | null };

function homeForRole(role: string): string {
  return role === "recruiter" ? "/employer" : "/ledger";
}

export async function signupAction(
  _prev: AuthState,
  form_data: FormData,
): Promise<AuthState> {
  const role = String(form_data.get("role") ?? "candidate");
  const result = createUser({
    email: String(form_data.get("email") ?? ""),
    name: String(form_data.get("name") ?? ""),
    password: String(form_data.get("password") ?? ""),
    company: String(form_data.get("company") ?? ""),
    role,
  });
  if (!result.ok) return { error: result.error };

  await createSession(result.id);
  redirect(homeForRole(result.role));
}

export async function loginAction(
  _prev: AuthState,
  form_data: FormData,
): Promise<AuthState> {
  const result = authenticateUser(
    String(form_data.get("email") ?? ""),
    String(form_data.get("password") ?? ""),
  );
  if (!result.ok) return { error: result.error };

  await createSession(result.id);
  const user = await getCurrentUser();
  redirect(homeForRole(user?.role ?? "candidate"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
