import StrengthBadge from "@/components/StrengthBadge";
import RaiseHandButton from "@/components/RaiseHandButton";
import type { JobMatch } from "@/lib/matching";
import styles from "@/app/employer.module.css";

const pipeline_copy: Record<JobMatch["pipeline_status"], string> = {
  none: "",
  surfaced: "You're in this pipeline — awaiting the employer's review.",
  approved: "This employer has reached out — see your requests.",
  rejected: "Not taken forward this time.",
};

/**
 * One assessed open role on the candidate's side: the worded fit, the reason it
 * was reached from their logged work, the strengths and gaps, and the deliberate
 * raise-hand step. The candidate-facing mirror of `EmployerMatchCard`.
 */
export default function CandidateJobMatchCard({ match }: { match: JobMatch }) {
  return (
    <article className={styles.match}>
      <div className={styles.matchTop}>
        <h3 className={styles.matchName}>{match.title}</h3>
        <StrengthBadge strength={match.strength} />
        <span className={styles.sourceTag}>
          {match.source === "kimi" ? "Reasoned by Kimi" : "Offline assessment"}
        </span>
      </div>

      <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.2rem" }}>
        {match.employer_company ?? "An employer"}
        {match.location ? ` · ${match.location}` : ""}
      </p>

      <p className={styles.matchReason}>{match.reason}</p>

      {match.pros.length > 0 || match.cons.length > 0 ? (
        <div className={styles.assumptions}>
          {match.pros.length > 0 ? (
            <>
              Why you fit
              <ul>
                {match.pros.map((pro) => (
                  <li key={pro}>{pro}</li>
                ))}
              </ul>
            </>
          ) : null}
          {match.cons.length > 0 ? (
            <>
              Gaps to close
              <ul>
                {match.cons.map((con) => (
                  <li key={con}>{con}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {match.matched_skills.length > 0 ? (
        <div
          style={{
            marginTop: "0.9rem",
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
          }}
        >
          {match.matched_skills.map((skill) => (
            <span key={skill} className="tag">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.matchActions}>
        {match.pipeline_status === "none" ? (
          <RaiseHandButton jobId={match.job_id} />
        ) : (
          <span
            className={match.pipeline_status === "approved" ? styles.replyState : "muted"}
          >
            {pipeline_copy[match.pipeline_status]}
          </span>
        )}
      </div>
    </article>
  );
}
