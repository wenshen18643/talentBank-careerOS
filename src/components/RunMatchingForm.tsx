"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "@/components/RunMatchingForm.module.css";

const phase_interval_ms = 2600;

/**
 * Ordered narration of what the match engine is actually doing, mirroring the
 * stages in `runMatching`: read the pool, gate on criteria, assess the survivors
 * with the LLM, then persist. The copy is honest about the work rather than a
 * generic "please wait", which is why the run feels productive instead of stuck.
 */
const matching_phases = [
  "Reading the candidate pool…",
  "Prequalifying against your role's criteria…",
  "Weighing each candidate's logged work…",
  "Wording the fit — the reason, pros, and cons…",
  "Finalizing the matches…",
] as const;

export default function RunMatchingForm({
  jobId,
  action,
}: {
  jobId: number;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="job_id" value={jobId} />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? (
          <>
            <Spinner />
            Finding matches…
          </>
        ) : (
          "Find matches"
        )}
      </button>
      {pending ? <MatchingOverlay /> : null}
    </>
  );
}

/**
 * Full-screen loader shown while the engine runs. Advances through
 * `matching_phases` on a fixed cadence and holds on the final phase, so a long
 * scan never loops back to "reading the pool" and looks stuck. Purely cosmetic
 * pacing — the server action owns the real progress — but it keeps the wait
 * legible. Announced politely for screen readers.
 */
function MatchingOverlay() {
  const phase_index = usePhasedProgress(matching_phases.length, phase_interval_ms);
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.card}>
        <div className={styles.ring} aria-hidden="true" />
        <h2 className={styles.title}>Running the match engine</h2>
        <p key={phase_index} className={styles.phrase}>
          {matching_phases[phase_index]}
        </p>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.bar} />
        </div>
      </div>
    </div>
  );
}

/**
 * Steps an index from 0 toward `count - 1` every `intervalMs`, clamping at the
 * last step so the caller can hold a terminal phase indefinitely.
 */
function usePhasedProgress(count: number, intervalMs: number): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => Math.min(current + 1, count - 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs]);
  return index;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "0.9rem",
        height: "0.9rem",
        border: "2px solid currentColor",
        borderRightColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.75s linear infinite",
      }}
    />
  );
}
