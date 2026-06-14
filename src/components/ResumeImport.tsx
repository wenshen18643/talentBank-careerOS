"use client";

import { useRef, useState } from "react";
import type { Entry } from "@/lib/entries-core";
import styles from "@/app/ledger.module.css";

/**
 * Résumé importer for the Living Ledger. Accepts a PDF / txt / md upload or
 * pasted text, sends it to the import endpoint, and hands the created draft
 * entries back to the ledger via `onImported`. Honest about whether Kimi or the
 * offline splitter produced the result.
 */
export default function ResumeImport({
  onImported,
}: {
  onImported: (entries: Entry[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const file = fileRef.current?.files?.[0];
    if (!file && pasted.trim().length < 20) {
      setError("Upload a file or paste at least a few lines.");
      return;
    }

    const form = new FormData();
    if (file) form.set("file", file);
    if (pasted.trim()) form.set("text", pasted.trim());

    setBusy(true);
    try {
      const response = await fetch("/api/resume/import", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }
      onImported(data.entries as Entry[]);
      const skills_added = (data.skills_added as string[] | undefined) ?? [];
      const skills_note =
        skills_added.length > 0
          ? ` Added ${skills_added.length} profile ${skills_added.length === 1 ? "skill" : "skills"}: ${skills_added.join(", ")}.`
          : "";
      setResult(
        `Imported ${data.count} ${data.count === 1 ? "entry" : "entries"}` +
          (data.source === "offline"
            ? " (offline split — refine to sharpen)."
            : " via Kimi.") +
          skills_note,
      );
      setPasted("");
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Network error — nothing was imported.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className={styles.importBar}>
        <div>
          <strong>Already have a résumé?</strong>{" "}
          <span className="muted">Import it to seed your ledger in seconds.</span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
          Import résumé
        </button>
      </div>
    );
  }

  return (
    <form className={styles.importPanel} onSubmit={submit}>
      <div className={styles.importTop}>
        <strong>Import a résumé</strong>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <label className={styles.fileDrop}>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
        />
        <span>{fileName ?? "Choose a PDF, .txt, or .md file"}</span>
      </label>

      <div className={styles.importOr}>or paste the text</div>

      <textarea
        className="textarea"
        value={pasted}
        onChange={(event) => setPasted(event.target.value)}
        placeholder="Paste your résumé here…"
        aria-label="Paste résumé text"
      />

      {error ? <p className="error-text">{error}</p> : null}
      {result ? <p className={styles.importResult}>{result}</p> : null}

      <div className={styles.composerActions} style={{ marginLeft: 0 }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Reading…" : "Import & add to ledger"}
        </button>
        <span className="muted" style={{ fontSize: "0.82rem" }}>
          Make it better with AI
        </span>
      </div>
    </form>
  );
}
