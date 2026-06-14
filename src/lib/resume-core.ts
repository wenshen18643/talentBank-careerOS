/**
 * Pure logic for importing an existing résumé into the Living Ledger. No
 * database or network here so parsing and the offline fallback are unit-testable
 * in isolation. The output is a list of *draft* entries the user can then refine
 * — importing never fabricates content, it only splits and classifies what's
 * already written.
 */

import { extractFirstJsonObject } from "@/lib/json-extract";
import { isEntryType, type EntryType } from "@/lib/entries-core";

export type ImportedEntry = {
  type: EntryType;
  raw_text: string;
  title?: string;
};

const max_entries = 40;
const max_raw_length = 4000;

const leadership_pattern =
  /\b(led|managed|mentored|directed|headed|oversaw|coached|built (?:and|&) led)\b/i;
const decision_pattern =
  /\b(decided|chose|prioriti[sz]ed|pivoted|migrated|deprecated|killed|sunset)\b/i;
const section_header_pattern = /^[A-Z][A-Z\s/&]{2,30}$/;

function classify(text: string): EntryType {
  if (leadership_pattern.test(text)) return "leadership";
  if (decision_pattern.test(text)) return "decision";
  return "project";
}

const import_system_prompt = `You convert a pasted résumé into a list of discrete career log entries. You never invent achievements or numbers — you only split and lightly tidy what is already written. Each entry is one project, decision, leadership moment, skill, or win.`;

export function buildImportMessages(
  resume_text: string,
): Array<{ role: "system" | "user"; content: string }> {
  const user_prompt = [
    "Résumé text:",
    `"""${resume_text.slice(0, 12000)}"""`,
    "",
    "Return ONLY minified JSON with this exact shape:",
    `{"entries":[{"type":"project"|"decision"|"leadership"|"skill"|"win","raw_text":string,"title":string}]}`,
    "- One entry per distinct accomplishment or responsibility.",
    "- raw_text: the accomplishment in the candidate's own words, lightly cleaned. Do not invent metrics.",
    "- title: a 3-6 word label.",
    "- Skip section headers, contact details, and pure skill lists (those aren't entries).",
  ].join("\n");

  return [
    { role: "system", content: import_system_prompt },
    { role: "user", content: user_prompt },
  ];
}

export function parseImportResponse(raw_response: string): ImportedEntry[] {
  const json_text = extractFirstJsonObject(raw_response);
  if (!json_text) throw new Error("Model response contained no JSON object.");
  const parsed = JSON.parse(json_text) as { entries?: unknown };
  if (!Array.isArray(parsed.entries)) {
    throw new Error("Model response had no entries array.");
  }

  const entries: ImportedEntry[] = [];
  for (const item of parsed.entries) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const raw_text = typeof record.raw_text === "string" ? record.raw_text.trim() : "";
    if (raw_text.length < 3) continue;
    const title = typeof record.title === "string" ? record.title.trim() : undefined;
    entries.push({
      type: isEntryType(record.type) ? record.type : "project",
      raw_text: raw_text.slice(0, max_raw_length),
      title: title || undefined,
    });
    if (entries.length >= max_entries) break;
  }

  if (entries.length === 0) throw new Error("No usable entries in the model response.");
  return entries;
}

/**
 * Deterministic offline import: split résumé text into bullet/line entries,
 * dropping section headers and trivially short lines, and classify each by verb.
 * Used when no Kimi key is set or the call fails.
 */
export function offlineImport(resume_text: string): ImportedEntry[] {
  const lines = resume_text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•*\-–—·]+/, "").trim());

  const entries: ImportedEntry[] = [];
  for (const line of lines) {
    if (line.length < 12) continue;
    if (section_header_pattern.test(line)) continue;
    if (/@|https?:\/\//.test(line) && line.length < 60) continue;
    entries.push({
      type: classify(line),
      raw_text: line.slice(0, max_raw_length),
      title: line.split(/\s+/).slice(0, 6).join(" "),
    });
    if (entries.length >= max_entries) break;
  }
  return entries;
}
