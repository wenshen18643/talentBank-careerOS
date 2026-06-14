import type { Message } from "@/lib/messages";
import styles from "@/app/employer.module.css";

/**
 * Renders a message thread for one match and a reply box. `currentUserId`
 * decides which side each bubble sits on; `replyAction` is the server action the
 * reply form posts to (employer or candidate variant).
 */
export default function MessageThread({
  messages,
  currentUserId,
  matchId,
  replyAction,
}: {
  messages: Message[];
  currentUserId: number;
  matchId: number;
  replyAction: (form_data: FormData) => Promise<void>;
}) {
  return (
    <div>
      <div className={styles.thread}>
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}
            >
              {!mine ? <span className={styles.bubbleMeta}>{message.sender_name}</span> : null}
              {message.body}
            </div>
          );
        })}
      </div>
      <form action={replyAction} className={styles.replyForm}>
        <input type="hidden" name="match_id" value={matchId} />
        <input
          className="input"
          name="body"
          placeholder="Write a reply…"
          aria-label="Reply"
          required
        />
        <button type="submit" className="btn btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
