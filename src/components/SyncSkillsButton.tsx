"use client";

import { useActionState } from "react";
import {
  syncSkillsFromLedgerAction,
  type SyncSkillsState,
} from "@/app/actions/candidate";
import styles from "@/app/employer.module.css";

const initial_state: SyncSkillsState = { ran: false, added: [] };

/**
 * Self-serve backfill for candidates whose résumé was imported before skill
 * inference existed. Scans their ledger and adds any taxonomy skills it shows to
 * the profile; the picker below remounts with the new selections.
 */
export default function SyncSkillsButton() {
  const [state, runSync, syncing] = useActionState(
    syncSkillsFromLedgerAction,
    initial_state,
  );

  return (
    <div className={styles.autoApplyBar} style={{ marginBottom: "1.75rem" }}>
      <div>
        <strong>Imported a résumé already?</strong>
        <p className="muted" style={{ fontSize: "0.88rem", margin: "0.2rem 0 0" }}>
          Scan your ledger and add any skills it shows to your profile.
        </p>
      </div>

      <form action={runSync}>
        <button type="submit" className="btn btn-ghost" disabled={syncing}>
          {syncing ? "Scanning…" : "Sync skills from my ledger"}
        </button>
      </form>

      {state.ran ? (
        <p
          className={state.added.length > 0 ? styles.replyState : "muted"}
          style={{ flexBasis: "100%", margin: 0, fontSize: "0.9rem" }}
        >
          {state.added.length > 0
            ? `◆ Added ${state.added.length} skill${state.added.length === 1 ? "" : "s"}: ${state.added.join(", ")}`
            : "No new skills found in your ledger — your profile is already up to date."}
        </p>
      ) : null}
    </div>
  );
}
