"use client";

import { useActionState } from "react";
import {
  expressInterestAction,
  type RaiseHandState,
} from "@/app/actions/candidate";
import styles from "@/app/employer.module.css";

const initial_state: RaiseHandState = { ok: false, message: "" };

/**
 * Raise-hand control for an assessed role. Reports its own outcome inline: a
 * confirmed pipeline entry, or the honest reason it couldn't (e.g. fit slipped).
 */
export default function RaiseHandButton({ jobId }: { jobId: number }) {
  const [state, submitInterest, pending] = useActionState(
    expressInterestAction,
    initial_state,
  );

  if (state.ok) {
    return <span className={styles.replyState}>✋ {state.message}</span>;
  }

  return (
    <form action={submitInterest}>
      <input type="hidden" name="job_id" value={jobId} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Raising…" : "Raise your hand"}
      </button>
      {state.message ? (
        <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.88rem" }}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
