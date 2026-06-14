"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { AuthState } from "@/app/actions/auth";
import styles from "@/app/auth.module.css";
import ledgerStyles from "@/app/ledger.module.css";

/**
 * Shared credential form for sign-up and sign-in. Drives a server action via
 * `useActionState`, surfacing validation errors inline and disabling submit
 * while pending. The `mode` switches copy and the name field.
 */
type Props = {
  mode: "signup" | "login";
  action: (state: AuthState, form_data: FormData) => Promise<AuthState>;
};

export default function AuthForm({ mode, action }: Props) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {
    error: null,
  });
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");
  const is_signup = mode === "signup";
  const is_recruiter = is_signup && role === "recruiter";

  return (
    <div className={styles.card}>
      <h1 className={styles.cardTitle}>
        {is_signup
          ? is_recruiter
            ? "Find the right person"
            : "Start your ledger"
          : "Welcome back"}
      </h1>
      <p className={styles.cardLede}>
        {is_signup
          ? is_recruiter
            ? "Define a role once. We surface candidates whose logged work fits — with a reason."
            : "Begin the running record of your work. Two minutes now."
          : "Pick up the long view of your career."}
      </p>

      <form action={formAction} className={styles.form} noValidate>
        {state.error ? (
          <p className={styles.formError} role="alert">
            {state.error}
          </p>
        ) : null}

        {is_signup ? (
          <div className="field">
            <span id="role-label" className="sr-only">
              I am a
            </span>
            <div
              className={ledgerStyles.typeChips}
              role="group"
              aria-labelledby="role-label"
            >
              {(["candidate", "recruiter"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${ledgerStyles.typeChip} ${
                    role === option ? ledgerStyles.typeChipActive : ""
                  }`}
                  aria-pressed={role === option}
                  onClick={() => setRole(option)}
                >
                  {option === "candidate" ? "I'm building a career" : "I'm hiring"}
                </button>
              ))}
            </div>
            <input type="hidden" name="role" value={role} />
          </div>
        ) : null}

        {is_signup ? (
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              name="name"
              className="input"
              autoComplete="name"
              required
              placeholder="Ada Lovelace"
            />
          </div>
        ) : null}

        {is_recruiter ? (
          <div className="field">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              className="input"
              autoComplete="organization"
              required
              placeholder="Acme Inc."
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            required
            placeholder="you@work.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            autoComplete={is_signup ? "new-password" : "current-password"}
            required
            minLength={8}
            placeholder={is_signup ? "At least 8 characters" : "Your password"}
          />
        </div>

        <SubmitButton label={is_signup ? "Create account" : "Sign in"} />
      </form>

      <p className={styles.alt}>
        {is_signup ? (
          <>
            Already keeping a ledger? <Link href="/login">Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/signup">Start your ledger</Link>
          </>
        )}
      </p>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn btn-primary ${styles.submit}`}
      disabled={pending}
    >
      {pending ? "One moment…" : label}
    </button>
  );
}
