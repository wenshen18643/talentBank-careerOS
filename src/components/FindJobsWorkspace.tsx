"use client";

import { useActionState } from "react";
import {
  autoApplyAction,
  findJobMatchesAction,
  type AutoApplyState,
  type FindJobsState,
} from "@/app/actions/candidate";
import CandidateJobMatchCard from "@/components/CandidateJobMatchCard";
import appStyles from "@/app/app.module.css";
import styles from "@/app/employer.module.css";

const initial_state: FindJobsState = { ran: false, matches: [] };
const initial_auto_apply: AutoApplyState = { done: false, applied: 0, skipped: 0 };

/**
 * The candidate's "Find jobs for me" surface — the mirror of the employer's
 * "Find matches" button. One click runs the matching engine over open roles
 * using the candidate's skills and logged work, then renders the worded fits.
 */
export default function FindJobsWorkspace() {
  const [state, runFind, pending] = useActionState(findJobMatchesAction, initial_state);
  const [autoState, runAutoApply, autoApplying] = useActionState(
    autoApplyAction,
    initial_auto_apply,
  );

  const open_matches = state.matches.filter((match) => match.pipeline_status === "none");

  return (
    <>
      <div className={styles.pipelineHead}>
        <h2 className={styles.pipelineTitle}>AI job match</h2>
        <form action={runFind}>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? (
              <>
                <Spinner />
                Finding your matches…
              </>
            ) : state.ran ? (
              "Run again"
            ) : (
              "Find jobs for me"
            )}
          </button>
        </form>
      </div>

      {!state.ran ? (
        <div className={appStyles.empty}>
          <h3>Let the engine read your work.</h3>
          <p>
            Run <strong>Find jobs for me</strong> to scan every open role against your
            skills and logged experience. Only credible fits — with the reasoning shown —
            will appear.
          </p>
        </div>
      ) : state.matches.length === 0 ? (
        <div className={appStyles.empty}>
          <h3>No strong fits open right now.</h3>
          <p>
            Nothing open is a credible match for your current skills and logged work yet.
            Add to your ledger or check back — new roles are assessed each time you run
            this.
          </p>
        </div>
      ) : (
        <section>
          {open_matches.length > 0 ? (
            <form action={runAutoApply} className={styles.autoApplyBar}>
              {open_matches.map((match) => (
                <input
                  key={match.job_id}
                  type="hidden"
                  name="job_id"
                  value={match.job_id}
                />
              ))}
              <div>
                <strong>Auto-apply to all</strong>
                <p
                  className="muted"
                  style={{ fontSize: "0.88rem", margin: "0.2rem 0 0" }}
                >
                  Raise your hand on every credible fit below in one go.
                </p>
              </div>
              <button type="submit" className="btn btn-primary" disabled={autoApplying}>
                {autoApplying ? (
                  <>
                    <Spinner />
                    Applying…
                  </>
                ) : (
                  `Auto-apply (${open_matches.length})`
                )}
              </button>
            </form>
          ) : null}

          {autoState.done ? (
            <p className={styles.replyState} style={{ marginBottom: "1.25rem" }}>
              ✋ Applied to {autoState.applied} role{autoState.applied === 1 ? "" : "s"}
              {autoState.skipped > 0
                ? ` · ${autoState.skipped} skipped (fit slipped). Run again to refresh.`
                : ". Run again to refresh their status."}
            </p>
          ) : null}

          {state.matches.map((match) => (
            <CandidateJobMatchCard key={match.job_id} match={match} />
          ))}
        </section>
      )}
    </>
  );
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
