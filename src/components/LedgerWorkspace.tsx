"use client";

import { useState } from "react";
import { entry_types, type Entry, type EntryType } from "@/lib/entries-core";
import { ArrowIcon } from "@/components/icons";
import ResumeImport from "@/components/ResumeImport";
import appStyles from "@/app/app.module.css";
import styles from "@/app/ledger.module.css";

/**
 * Interactive Living Ledger: compose raw entries, then run "Improve & Expand"
 * per entry. All mutations hit the JSON API and update local state in place, so
 * logging stays instant and refinement is an explicit, visible step.
 */
export default function LedgerWorkspace({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [draft, setDraft] = useState("");
  const [type, setType] = useState<EntryType>("project");
  const [occurredAt, setOccurredAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submitEntry(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: draft, type, occurred_at: occurredAt || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFormError(data.error ?? "Could not save that entry.");
        return;
      }
      setEntries((current) => [data.entry as Entry, ...current]);
      setDraft("");
      setOccurredAt("");
    } catch {
      setFormError("Network error — your entry wasn't saved.");
    } finally {
      setSaving(false);
    }
  }

  function prependEntries(created: Entry[]) {
    setEntries((current) => [...created, ...current]);
  }

  function replaceEntry(updated: Entry) {
    setEntries((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
  }

  function removeEntry(id: number) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <>
      <ResumeImport onImported={prependEntries} />

      <form className={styles.composer} onSubmit={submitEntry}>
        <textarea
          className="textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What did you do? Rough words are fine — &ldquo;led the migration off the legacy billing system, took about three months, no downtime.&rdquo;"
          aria-label="Log entry"
        />
        <div className={styles.composerRow}>
          <div className={styles.typeChips} role="group" aria-label="Entry type">
            {entry_types.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.typeChip} ${
                  type === option ? styles.typeChipActive : ""
                }`}
                aria-pressed={type === option}
                onClick={() => setType(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className={styles.composerActions}>
            <input
              type="date"
              className={`input ${styles.dateInput}`}
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              aria-label="When did this happen (optional)"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || draft.trim().length < 3}
            >
              {saving ? "Saving…" : "Log it"}
            </button>
          </div>
        </div>
        {formError ? <p className={`error-text ${styles.toast}`}>{formError}</p> : null}
      </form>

      {entries.length === 0 ? (
        <div className={appStyles.empty}>
          <h3>Nothing logged yet.</h3>
          <p>The entry above is waiting. One sentence is a perfectly good start.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {entries.map((entry) => (
            <LedgerEntry
              key={entry.id}
              entry={entry}
              onRefined={replaceEntry}
              onDeleted={removeEntry}
            />
          ))}
        </div>
      )}
    </>
  );
}

function LedgerEntry({
  entry,
  onRefined,
  onDeleted,
}: {
  entry: Entry;
  onRefined: (entry: Entry) => void;
  onDeleted: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refine() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const response = await fetch(`/api/entries/${entry.id}/refine`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Refinement failed.");
        return;
      }
      onRefined(data.entry as Entry);
      if (data.note) setNote(data.note as string);
    } catch {
      setError("Network error — refinement didn't run.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
      if (response.ok) onDeleted(entry.id);
    } finally {
      setBusy(false);
    }
  }

  const fields = entry.extracted;

  return (
    <article className={styles.entry}>
      <div className={styles.entryTop}>
        <span className="tag">{entry.type}</span>
        {entry.status === "refined" ? (
          <span className="muted" style={{ fontSize: "0.82rem" }}>
            Refined
          </span>
        ) : (
          <span className="muted" style={{ fontSize: "0.82rem" }}>
            Raw
          </span>
        )}
        {entry.occurred_at ? (
          <span className={styles.entryDate}>{entry.occurred_at}</span>
        ) : null}
      </div>

      <p className={styles.entryRaw}>{entry.raw_text}</p>

      {fields ? (
        <div className={styles.refined}>
          <p className={styles.refinedBullet}>{fields.bullet}</p>
          <div className={styles.refinedMeta}>
            {fields.skills.length > 0 ? (
              <div>
                <div className={styles.metaLabel}>Skills</div>
                <div className={styles.chips}>
                  {fields.skills.map((skill) => (
                    <span key={skill} className="tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {fields.metrics.length > 0 ? (
              <div>
                <div className={styles.metaLabel}>Metrics found</div>
                <div className={styles.chips}>
                  {fields.metrics.map((metric) => (
                    <span key={metric} className="tag">
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {fields.scope ? (
              <div>
                <div className={styles.metaLabel}>Scope</div>
                <span className="muted">{fields.scope}</span>
              </div>
            ) : null}
          </div>
          {note ? <p className={styles.sourceNote}>{note}</p> : null}
        </div>
      ) : null}

      {error ? (
        <p className={`error-text ${styles.toast}`} style={{ marginTop: "0.8rem" }}>
          {error}
        </p>
      ) : null}

      <div className={styles.entryActions}>
        <button type="button" className="btn btn-ghost" onClick={refine} disabled={busy}>
          {busy ? <span className={styles.spinner} aria-hidden /> : null}
          {entry.status === "refined" ? "Re-run Improve & Expand" : "Improve & Expand"}
          {!busy ? <ArrowIcon width={16} height={16} /> : null}
        </button>
        <button type="button" className="btn btn-quiet" onClick={remove} disabled={busy}>
          Delete
        </button>
      </div>
    </article>
  );
}
