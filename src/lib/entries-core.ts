/**
 * Pure domain logic for the Living Ledger. No database or network access lives
 * here so every branch is unit-testable in isolation: entry typing, prompt
 * construction, model-response parsing, and CV compilation.
 */

import { extractFirstJsonObject } from "@/lib/json-extract";

export const entry_types = [
  "project",
  "decision",
  "leadership",
  "skill",
  "win",
] as const;

export type EntryType = (typeof entry_types)[number];

export type ExtractedFields = {
  title: string;
  impact: string;
  metrics: string[];
  skills: string[];
  scope: string;
  bullet: string;
};

export type Entry = {
  id: number;
  user_id: number;
  type: EntryType;
  raw_text: string;
  title: string | null;
  extracted: ExtractedFields | null;
  status: "raw" | "refined";
  occurred_at: string | null;
  created_at: string;
};

export function isEntryType(value: unknown): value is EntryType {
  return (
    typeof value === "string" && entry_types.includes(value as EntryType)
  );
}

const max_raw_length = 4000;

/**
 * Validates and normalises raw log input before persistence. Returns either a
 * clean payload or a human-readable error — never throws on bad user input.
 */
export function validateRawEntry(input: {
  raw_text?: unknown;
  type?: unknown;
  occurred_at?: unknown;
}):
  | { ok: true; value: { raw_text: string; type: EntryType; occurred_at: string | null } }
  | { ok: false; error: string } {
  const raw_text =
    typeof input.raw_text === "string" ? input.raw_text.trim() : "";
  if (raw_text.length < 3) {
    return { ok: false, error: "Write at least a few words about what happened." };
  }
  if (raw_text.length > max_raw_length) {
    return { ok: false, error: `Keep it under ${max_raw_length} characters.` };
  }
  const type: EntryType = isEntryType(input.type) ? input.type : "project";
  const occurred_at =
    typeof input.occurred_at === "string" && input.occurred_at.trim()
      ? input.occurred_at.trim()
      : null;
  return { ok: true, value: { raw_text, type, occurred_at } };
}

const refine_system_prompt = `You are a career historian helping a professional turn a rough log of something they did into a precise, truthful CV bullet. You never invent numbers or achievements. If a metric is not present, you leave it out rather than fabricating it. You write in plain, human language — no corporate buzzwords, no "synergy", no false precision.`;

/**
 * Builds the chat messages sent to the model for the "Improve & Expand" pass.
 * The instruction is strict about JSON shape so {@link parseRefineResponse} can
 * consume it deterministically.
 */
export function buildRefineMessages(entry: {
  type: EntryType;
  raw_text: string;
}): Array<{ role: "system" | "user"; content: string }> {
  const user_prompt = [
    `Entry type: ${entry.type}`,
    `Raw log: """${entry.raw_text}"""`,
    "",
    "Return ONLY minified JSON with this exact shape:",
    `{"title":string,"impact":string,"metrics":string[],"skills":string[],"scope":string,"bullet":string}`,
    "- title: a 3-6 word name for this entry.",
    "- impact: one sentence on why it mattered, no fabricated numbers.",
    "- metrics: concrete figures present in the raw log only; [] if none.",
    "- skills: 2-6 skills demonstrated.",
    "- scope: team size / budget / timeframe if stated, else \"\".",
    "- bullet: one resume-ready line, starts with a strong verb, <= 240 chars.",
  ].join("\n");

  return [
    { role: "system", content: refine_system_prompt },
    { role: "user", content: user_prompt },
  ];
}

/**
 * Parses a model response into {@link ExtractedFields}. Tolerates code fences
 * and surrounding prose by extracting the first balanced JSON object. Throws a
 * descriptive error if no usable object is found so callers can fall back.
 */
export function parseRefineResponse(raw_response: string): ExtractedFields {
  const json_text = extractFirstJsonObject(raw_response);
  if (!json_text) {
    throw new Error("Model response contained no JSON object.");
  }
  const parsed = JSON.parse(json_text) as Record<string, unknown>;

  const asString = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";
  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean)
      : [];

  const bullet = asString(parsed.bullet);
  if (!bullet) {
    throw new Error("Model response was missing the resume bullet.");
  }

  return {
    title: asString(parsed.title),
    impact: asString(parsed.impact),
    metrics: asStringArray(parsed.metrics),
    skills: asStringArray(parsed.skills),
    scope: asString(parsed.scope),
    bullet,
  };
}

/**
 * Deterministic offline refinement used when no Kimi key is configured, so the
 * prototype is fully functional without external calls. It restructures the raw
 * text without inventing facts.
 */
export function offlineRefine(entry: {
  type: EntryType;
  raw_text: string;
}): ExtractedFields {
  const sentences = entry.raw_text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const first = sentences[0] ?? entry.raw_text.trim();
  const metrics =
    entry.raw_text.match(
      /\$?\d[\d,.]*\s?(?:%|hrs?|hours?|days?|weeks?|months?|people|users?|x|k|m)?/gi,
    ) ?? [];
  const title = first.split(/\s+/).slice(0, 6).join(" ");
  const verb = entry.type === "leadership" ? "Led" : "Delivered";
  const starts_with_action = /^[A-Z][a-z]+ed\b|^Led\b/.test(first);
  const bullet = (
    starts_with_action
      ? first
      : `${verb} ${first.charAt(0).toLowerCase()}${first.slice(1)}`
  ).replace(/\.$/, "");

  return {
    title,
    impact: first,
    metrics: [...new Set(metrics.map((m) => m.trim()))].slice(0, 5),
    skills: [],
    scope: "",
    bullet: bullet.slice(0, 240),
  };
}

/**
 * Compiles refined entries into a grouped CV view model. Raw (unrefined)
 * entries are reported separately so the UI can nudge the user to refine them.
 */
export function compileCv(entries: Entry[]): {
  sections: Array<{ type: EntryType; bullets: Array<{ id: number; bullet: string; title: string }> }>;
  skills: string[];
  unrefined_count: number;
} {
  const refined = entries.filter((e) => e.status === "refined" && e.extracted);
  const skills = new Set<string>();
  const grouped = new Map<EntryType, Array<{ id: number; bullet: string; title: string }>>();

  for (const entry of refined) {
    const fields = entry.extracted as ExtractedFields;
    fields.skills.forEach((s) => skills.add(s));
    const list = grouped.get(entry.type) ?? [];
    list.push({ id: entry.id, bullet: fields.bullet, title: fields.title });
    grouped.set(entry.type, list);
  }

  const sections = entry_types
    .filter((type) => grouped.has(type))
    .map((type) => ({ type, bullets: grouped.get(type) as Array<{ id: number; bullet: string; title: string }> }));

  return {
    sections,
    skills: [...skills].sort((a, b) => a.localeCompare(b)),
    unrefined_count: entries.length - refined.length,
  };
}
