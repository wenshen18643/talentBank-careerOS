import StrengthBadge from "@/components/StrengthBadge";
import MessageThread from "@/components/MessageThread";
import type { CandidateRequest } from "@/lib/matching";
import type { Message } from "@/lib/messages";
import { candidateReplyAction, respondToRequestAction } from "@/app/actions/candidate";
import styles from "@/app/employer.module.css";

/**
 * One incoming interview request as the candidate sees it: who's reaching out,
 * the role, the employer's stated reason, and accept / decline controls. After
 * a reply, the conversation thread stays open.
 */
export default function CandidateRequestCard({
  request,
  candidateId,
  messages,
}: {
  request: CandidateRequest;
  candidateId: number;
  messages: Message[];
}) {
  const company = request.employer_company ?? request.employer_name;

  return (
    <article className={`${styles.match} ${styles.matchApproved}`}>
      <div className={styles.matchTop}>
        <h3 className={styles.matchName}>{request.job_title}</h3>
        <StrengthBadge strength={request.strength} />
      </div>
      <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.2rem" }}>
        {company} reached out
      </p>

      <p className={styles.matchReason}>{request.reason}</p>

      {request.candidate_reply === null ? (
        <div className={styles.matchActions}>
          <form action={respondToRequestAction}>
            <input type="hidden" name="match_id" value={request.id} />
            <input type="hidden" name="reply" value="accepted" />
            <button type="submit" className="btn btn-primary">
              I&apos;m interested
            </button>
          </form>
          <form action={respondToRequestAction}>
            <input type="hidden" name="match_id" value={request.id} />
            <input type="hidden" name="reply" value="declined" />
            <button type="submit" className="btn btn-ghost">
              Not right now
            </button>
          </form>
        </div>
      ) : (
        <p
          className={request.candidate_reply === "accepted" ? styles.replyState : "muted"}
          style={{ marginTop: "0.9rem" }}
        >
          {request.candidate_reply === "accepted"
            ? "◆ You opened this conversation."
            : "You passed on this one."}
        </p>
      )}

      {request.candidate_reply === "accepted" ? (
        <MessageThread
          messages={messages}
          currentUserId={candidateId}
          matchId={request.id}
          replyAction={candidateReplyAction}
        />
      ) : null}
    </article>
  );
}
