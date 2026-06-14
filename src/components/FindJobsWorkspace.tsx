"use client";

import { useActionState } from "react";
import {
  findJobMatchesAction,
  type FindJobsState,
} from "@/app/actions/candidate";
import CandidateJobMatchCard from "@/components/CandidateJobMatchCard";
import appStyles from "@/app/app.module.css";
import styles from "@/app/employer.module.css";

const initial_state: FindJobsState = { ran: false, matches: [] };

/**
 * The candidate's "Find jobs for me" surface — the mirror of the employer's
 * "Find matches" button. One click runs the matching engine over open roles
 * using the candidate's skills and logged work, then renders the worded fits.
 */
export default function FindJobsWorkspace() {
  const [state, runFind, pending] = useActionState(
    findJobMatchesAction,
    initial_state,
  );

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
            Run <strong>Find jobs for me</strong> to scan every open role against
            your skills and logged experience. Only credible fits — with the
            reasoning shown — will appear.
          </p>
        </div>
      ) : state.matches.length === 0 ? (
        <div className={appStyles.empty}>
          <h3>No strong fits open right now.</h3>
          <p>
            Nothing open is a credible match for your current skills and logged
            work yet. Add to your ledger or check back — new roles are assessed
            each time you run this.
          </p>
        </div>
      ) : (
        <section>
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
