/**
 * Pure matching logic. No database or network here so the gatekeeper rules and
 * model-response handling are unit-testable in isolation.
 *
 * The engine is deliberately two-stage and honest:
 *   1. a deterministic skill prequalifier decides whether a candidate even
 *      surfaces (the gatekeeper), and
 *   2. a model (or offline fallback) explains the fit in plain language with a
 *      worded strength — never an opaque numeric score.
 */

import { extractFirstJsonObject } from "@/lib/json-extract";

export const match_strengths = ["strong", "promising", "stretch"] as const;
export type MatchStrength = (typeof match_strengths)[number];

export type JobCriteria = {
  title: string;
  description: string;
  location: string | null;
  required_skills: string[];
  nice_skills: string[];
  criteria: string;
};

export type CandidateProfile = {
  id: number;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  bullets: string[];
};

export type Prequalification = {
  qualifies: boolean;
  matched_required: string[];
  matched_nice: string[];
  missing_required: string[];
};

export type MatchAssessment = {
  strength: MatchStrength;
  reason: string;
  assumptions: string[];
  pros: string[];
  cons: string[];
};

function normalise(skill: string): string {
  return skill.trim().toLowerCase();
}

function intersect(candidate: string[], wanted: string[]): string[] {
  const have = new Set(candidate.map(normalise));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of wanted) {
    const key = normalise(skill);
    if (have.has(key) && !seen.has(key)) {
      seen.add(key);
      result.push(skill.trim());
    }
  }
  return result;
}

function difference(wanted: string[], candidate: string[]): string[] {
  const have = new Set(candidate.map(normalise));
  return wanted.filter((skill) => !have.has(normalise(skill)));
}

/**
 * The gatekeeper. A candidate surfaces only when their logged skills overlap a
 * job's criteria meaningfully: at least one required skill, or — when a job
 * lists no required skills — at least two nice-to-haves.
 */
export function prequalify(
  job: Pick<JobCriteria, "required_skills" | "nice_skills">,
  candidate: Pick<CandidateProfile, "skills">,
): Prequalification {
  const matched_required = intersect(candidate.skills, job.required_skills);
  const matched_nice = intersect(candidate.skills, job.nice_skills);
  const missing_required = difference(job.required_skills, candidate.skills);

  const qualifies =
    job.required_skills.length > 0
      ? matched_required.length >= 1
      : matched_nice.length >= 2;

  return { qualifies, matched_required, matched_nice, missing_required };
}

/**
 * Heuristic worded strength used by the offline path and as a sane default.
 * `strong` = every required skill present plus a nice-to-have; `promising` =
 * at least half the required skills; otherwise `stretch`.
 */
export function gradeStrength(
  job: Pick<JobCriteria, "required_skills">,
  pre: Prequalification,
): MatchStrength {
  const required_count = job.required_skills.length;
  if (required_count === 0) {
    return pre.matched_nice.length >= 3 ? "strong" : "promising";
  }
  const covered = pre.matched_required.length / required_count;
  if (covered >= 1 && pre.matched_nice.length >= 1) return "strong";
  if (covered >= 0.5) return "promising";
  return "stretch";
}

const match_system_prompt = `You explain to an employer why a candidate is a credible match for a role, in plain language. You read the candidate's own logged work, not a keyword count. You are honest about gaps and you name the assumptions your judgement rests on. You never output a numeric score or percentage — fit is communicated in words and reasoning only. You never invent experience the candidate did not log.`;

/**
 * Builds the messages for the model's match assessment. The prequalification is
 * provided as grounding so the model reasons from real overlap, not guesses.
 */
export function buildMatchMessages(
  job: JobCriteria,
  candidate: CandidateProfile,
  pre: Prequalification,
): Array<{ role: "system" | "user"; content: string }> {
  const user_prompt = [
    `Role: ${job.title}`,
    job.location ? `Location: ${job.location}` : null,
    `Role description: ${job.description || "(none provided)"}`,
    `Required skills: ${job.required_skills.join(", ") || "(none)"}`,
    `Nice-to-have skills: ${job.nice_skills.join(", ") || "(none)"}`,
    `Other criteria / trajectory wanted: ${job.criteria || "(none)"}`,
    "",
    `Candidate: ${candidate.name}${candidate.headline ? ` — ${candidate.headline}` : ""}`,
    `Skills they have demonstrated: ${candidate.skills.join(", ") || "(none logged)"}`,
    `Skills overlapping this role: required [${pre.matched_required.join(", ")}], nice [${pre.matched_nice.join(", ")}]`,
    `Required skills they have NOT logged: ${pre.missing_required.join(", ") || "(none)"}`,
    "Their logged work:",
    ...candidate.bullets.slice(0, 8).map((b) => `- ${b}`),
    "",
    "Return ONLY minified JSON with this exact shape:",
    `{"strength":"strong"|"promising"|"stretch","reason":string,"assumptions":string[],"pros":string[],"cons":string[]}`,
    "- strength: your honest read of fit, including trajectory, as one of those three words.",
    "- reason: a concise 2-3 sentence summary of fit, citing their actual logged work.",
    "- assumptions: the 1-3 things your judgement depends on (e.g. inferred seniority).",
    "- pros: 2-4 specific strengths this candidate brings, backed by their logged work.",
    "- cons: 1-3 real gaps or risks, stated plainly.",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: match_system_prompt },
    { role: "user", content: user_prompt },
  ];
}

export function parseMatchResponse(raw_response: string): MatchAssessment {
  const json_text = extractFirstJsonObject(raw_response);
  if (!json_text) throw new Error("Model response contained no JSON object.");
  const parsed = JSON.parse(json_text) as Record<string, unknown>;

  const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
  if (!reason) throw new Error("Model response was missing the reason.");

  const strength = (match_strengths as readonly string[]).includes(
    parsed.strength as string,
  )
    ? (parsed.strength as MatchStrength)
    : "promising";

  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .filter((a): a is string => typeof a === "string")
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

  return {
    strength,
    reason,
    assumptions: asStringArray(parsed.assumptions),
    pros: asStringArray(parsed.pros),
    cons: asStringArray(parsed.cons),
  };
}

/**
 * Deterministic, no-network assessment used when no Kimi key is set or the call
 * fails. It states the overlap and the gap plainly and refuses to imply more.
 */
export function offlineMatch(
  job: JobCriteria,
  candidate: CandidateProfile,
  pre: Prequalification,
): MatchAssessment {
  const matched = [...pre.matched_required, ...pre.matched_nice];
  const overlap_clause =
    matched.length > 0
      ? `Overlaps on ${matched.join(", ")}.`
      : "Overlaps on logged skills.";
  const evidence_clause = candidate.bullets[0]
    ? ` Logged work includes: "${truncate(candidate.bullets[0], 140)}".`
    : "";
  const gap_clause =
    pre.missing_required.length > 0
      ? ` Hasn't logged: ${pre.missing_required.join(", ")}.`
      : "";

  return {
    strength: gradeStrength(job, pre),
    reason:
      `${overlap_clause}${evidence_clause}${gap_clause}`.trim() ||
      "Overlaps on logged skills.",
    assumptions: [
      "Assessed from logged skill overlap and bullets only; trajectory not yet AI-evaluated (no Kimi key set).",
    ],
    pros:
      matched.length > 0
        ? [`Has ${matched.join(", ")}`]
        : ["Has demonstrated logged skills"],
    cons:
      pre.missing_required.length > 0
        ? [`Hasn't logged: ${pre.missing_required.join(", ")}`]
        : ["Offline assessment — fit may need closer review."],
  };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
