import StrengthBadge from "@/components/StrengthBadge";
import MessageThread from "@/components/MessageThread";
import type { Match } from "@/lib/matching";
import type { Message } from "@/lib/messages";
import { decideMatchAction, employerReplyAction } from "@/app/actions/employer";
import styles from "@/app/employer.module.css";

/**
 * One surfaced candidate in an employer's pipeline: the worded fit, the
 * plain-language reason, the assumptions it rests on, and the approve / reject
 * controls. Once approved, the outreach thread opens inline.
 */
export default function EmployerMatchCard({
  match,
  employerId,
  messages,
}: {
  match: Match;
  employerId: number;
  messages: Message[];
}) {
  const cardClass =
    match.status === "approved"
      ? `${styles.match} ${styles.matchApproved}`
      : match.status === "rejected"
        ? `${styles.match} ${styles.matchRejected}`
        : styles.match;

  return (
    <article className={cardClass}>
      <div className={styles.matchTop}>
        <h3 className={styles.matchName}>{match.candidate_name}</h3>
        <StrengthBadge strength={match.strength} />
        {match.initiated_by === "candidate" ? (
          <span className={`${styles.strength} ${styles.strengthPromising}`}>
            ✋ Raised their hand
          </span>
        ) : null}
        <span className={styles.sourceTag}>
          {match.source === "kimi" ? "Reasoned by Kimi" : "Offline assessment"}
        </span>
      </div>

      {match.candidate_headline ? (
        <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.2rem" }}>
          {match.candidate_headline}
          {match.candidate_location ? ` · ${match.candidate_location}` : ""}
        </p>
      ) : null}

      <p className={styles.matchReason}>{match.reason}</p>

      {match.pros.length > 0 || match.cons.length > 0 ? (
        <div className={styles.assumptions}>
          {match.pros.length > 0 ? (
            <>
              Strengths
              <ul>
                {match.pros.map((pro) => (
                  <li key={pro}>{pro}</li>
                ))}
              </ul>
            </>
          ) : null}
          {match.cons.length > 0 ? (
            <>
              Gaps / risks
              <ul>
                {match.cons.map((con) => (
                  <li key={con}>{con}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {match.status === "surfaced" ? (
        <div className={styles.matchActions}>
          <form action={decideMatchAction}>
            <input type="hidden" name="match_id" value={match.id} />
            <input type="hidden" name="decision" value="approved" />
            <button type="submit" className="btn btn-primary">
              Approve &amp; reach out
            </button>
          </form>
          <form action={decideMatchAction}>
            <input type="hidden" name="match_id" value={match.id} />
            <input type="hidden" name="decision" value="rejected" />
            <button type="submit" className="btn btn-ghost">
              Not a fit
            </button>
          </form>
        </div>
      ) : null}

      {match.status === "rejected" ? (
        <p className="muted" style={{ marginTop: "0.9rem", fontSize: "0.88rem" }}>
          Passed on this candidate.
        </p>
      ) : null}

      {match.status === "approved" ? (
        <>
          <div className={styles.matchActions}>
            {match.candidate_reply === "accepted" ? (
              <span className={styles.replyState}>
                ◆ Candidate accepted — the conversation is open
              </span>
            ) : match.candidate_reply === "declined" ? (
              <span className="muted">Candidate declined for now.</span>
            ) : (
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                Outreach sent — awaiting their reply.
              </span>
            )}
          </div>
          <MessageThread
            messages={messages}
            currentUserId={employerId}
            matchId={match.id}
            replyAction={employerReplyAction}
          />
        </>
      ) : null}
    </article>
  );
}
