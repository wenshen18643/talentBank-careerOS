import { getDb } from "@/lib/db";
import { getJob, getJobById, type Job } from "@/lib/jobs";
import { assessMatch } from "@/lib/kimi";
import {
  prequalify,
  type CandidateProfile,
  type MatchStrength,
} from "@/lib/matching-core";
import type { ExtractedFields } from "@/lib/entries-core";

/**
 * Matching engine and the `matches` repository. The engine is the gatekeeper:
 * it builds candidate profiles from refined ledger entries, prequalifies them
 * against a job, and only writes a surfaced match when the deterministic gate
 * passes. Employer decisions (approved / rejected) are never overwritten by a
 * re-run.
 */

export type Match = {
  id: number;
  job_id: number;
  candidate_id: number;
  status: "surfaced" | "approved" | "rejected";
  strength: MatchStrength;
  reason: string;
  assumptions: string[];
  pros: string[];
  cons: string[];
  source: "kimi" | "offline";
  initiated_by: "engine" | "candidate";
  candidate_reply: "accepted" | "declined" | null;
  created_at: string;
  candidate_name: string;
  candidate_headline: string | null;
  candidate_location: string | null;
};

type MatchRow = {
  id: number;
  job_id: number;
  candidate_id: number;
  status: string;
  strength: string;
  reason: string;
  assumptions: string;
  pros: string;
  cons: string;
  source: string;
  initiated_by: string;
  candidate_reply: string | null;
  created_at: string;
  candidate_name: string;
  candidate_headline: string | null;
  candidate_location: string | null;
};

function hydrateMatch(row: MatchRow): Match {
  return {
    id: row.id,
    job_id: row.job_id,
    candidate_id: row.candidate_id,
    status:
      row.status === "approved"
        ? "approved"
        : row.status === "rejected"
          ? "rejected"
          : "surfaced",
    strength: row.strength as MatchStrength,
    reason: row.reason,
    assumptions: safeParseArray(row.assumptions),
    pros: safeParseArray(row.pros),
    cons: safeParseArray(row.cons),
    source: row.source === "kimi" ? "kimi" : "offline",
    initiated_by: row.initiated_by === "candidate" ? "candidate" : "engine",
    candidate_reply:
      row.candidate_reply === "accepted"
        ? "accepted"
        : row.candidate_reply === "declined"
          ? "declined"
          : null,
    created_at: row.created_at,
    candidate_name: row.candidate_name,
    candidate_headline: row.candidate_headline,
    candidate_location: row.candidate_location,
  };
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

type CandidateRow = {
  id: number;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string;
};

function collectBullets(candidate_id: number): string[] {
  const rows = getDb()
    .prepare(`SELECT extracted FROM entries WHERE user_id = ? AND status = 'refined'`)
    .all(candidate_id) as Array<{ extracted: string | null }>;
  const bullets: string[] = [];
  for (const row of rows) {
    if (!row.extracted) continue;
    const fields = JSON.parse(row.extracted) as ExtractedFields;
    if (fields.bullet) bullets.push(fields.bullet);
  }
  return bullets;
}

function toProfile(row: CandidateRow): CandidateProfile {
  let skills: string[] = [];
  try {
    const parsed = JSON.parse(row.skills);
    if (Array.isArray(parsed)) skills = parsed.filter((s) => typeof s === "string");
  } catch {
    skills = [];
  }
  return {
    id: row.id,
    name: row.name,
    headline: row.headline,
    location: row.location,
    skills,
    bullets: collectBullets(row.id),
  };
}

/**
 * Builds a profile for every candidate who has declared at least one skill from
 * the controlled vocabulary. Skills are the canonical, on-list profile skills —
 * the matching surface — while bullets come from refined ledger entries as
 * evidence for the assessment.
 */
function candidateProfiles(): CandidateProfile[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name, headline, location, skills FROM users
       WHERE role = 'candidate' AND skills IS NOT NULL AND skills != '[]'`,
    )
    .all() as CandidateRow[];
  return rows.map(toProfile);
}

function getCandidateProfile(candidate_id: number): CandidateProfile | null {
  const row = getDb()
    .prepare(
      `SELECT id, name, headline, location, skills FROM users
       WHERE id = ? AND role = 'candidate'`,
    )
    .get(candidate_id) as CandidateRow | undefined;
  return row ? toProfile(row) : null;
}

const upsert_match = `
  INSERT INTO matches (job_id, candidate_id, status, strength, reason, assumptions, pros, cons, source, initiated_by)
  VALUES (@job_id, @candidate_id, 'surfaced', @strength, @reason, @assumptions, @pros, @cons, @source, @initiated_by)
  ON CONFLICT (job_id, candidate_id) DO UPDATE SET
    strength = excluded.strength,
    reason = excluded.reason,
    assumptions = excluded.assumptions,
    pros = excluded.pros,
    cons = excluded.cons,
    source = excluded.source,
    initiated_by = CASE
      WHEN excluded.initiated_by = 'candidate' THEN 'candidate'
      ELSE matches.initiated_by
    END
  WHERE matches.status = 'surfaced'
`;

export type MatchingSummary = {
  evaluated: number;
  surfaced: number;
};

/**
 * Runs the engine for one job: prequalifies every candidate, and for those who
 * pass the gate, generates a worded assessment (Kimi or offline) and upserts a
 * surfaced match. Returns how many were evaluated and how many surfaced.
 */
export async function runMatching(
  employer_id: number,
  job_id: number,
): Promise<MatchingSummary> {
  const job = getJob(employer_id, job_id);
  if (!job) throw new Error("Job not found.");

  const profiles = candidateProfiles();
  const upsert = getDb().prepare(upsert_match);
  let surfaced = 0;

  for (const candidate of profiles) {
    const pre = prequalify(job, candidate);
    if (!pre.qualifies) continue;

    const { assessment, source } = await assessMatch(job, candidate, pre);
    if (assessment.strength === "stretch") continue;

    upsert.run({
      job_id: job.id,
      candidate_id: candidate.id,
      strength: assessment.strength,
      reason: assessment.reason,
      assumptions: JSON.stringify(assessment.assumptions),
      pros: JSON.stringify(assessment.pros),
      cons: JSON.stringify(assessment.cons),
      source,
      initiated_by: "engine",
    });
    surfaced += 1;
  }

  return { evaluated: profiles.length, surfaced };
}

/**
 * Open roles a candidate qualifies for, annotated with whether they're already
 * in the pipeline. Powers the candidate-facing discovery page: a person can only
 * see — and therefore raise their hand on — roles their on-list skills match.
 */
export type DiscoverJob = Job & {
  employer_company: string | null;
  matched_skills: string[];
  pipeline_status: "none" | "surfaced" | "approved" | "rejected";
};

export function listDiscoverJobs(candidate_id: number): DiscoverJob[] {
  const profile = getCandidateProfile(candidate_id);
  if (!profile || profile.skills.length === 0) return [];

  const rows = getDb()
    .prepare(
      `SELECT j.id, emp.company AS employer_company
       FROM jobs j JOIN users emp ON emp.id = j.employer_id
       WHERE j.status = 'open' ORDER BY j.created_at DESC`,
    )
    .all() as Array<{ id: number; employer_company: string | null }>;

  const pipeline = new Map(
    (
      getDb()
        .prepare(`SELECT job_id, status FROM matches WHERE candidate_id = ?`)
        .all(candidate_id) as Array<{ job_id: number; status: string }>
    ).map((row) => [row.job_id, row.status]),
  );

  const result: DiscoverJob[] = [];
  for (const row of rows) {
    const job = getJobById(row.id);
    if (!job) continue;
    const pre = prequalify(job, profile);
    if (!pre.qualifies) continue;
    const status = pipeline.get(job.id);
    result.push({
      ...job,
      employer_company: row.employer_company,
      matched_skills: [...pre.matched_required, ...pre.matched_nice],
      pipeline_status:
        status === "approved"
          ? "approved"
          : status === "rejected"
            ? "rejected"
            : status === "surfaced"
              ? "surfaced"
              : "none",
    });
  }
  return result;
}

/**
 * Candidate-initiated interest. Surfaces the candidate into a job's pipeline
 * flagged `candidate`, but only when they genuinely qualify — express-interest
 * is gated by the same skill match as the engine, so it can't become spam.
 */
export async function raiseHand(
  candidate_id: number,
  job_id: number,
): Promise<{ ok: boolean; reason: string }> {
  const profile = getCandidateProfile(candidate_id);
  const job = getJobById(job_id);
  if (!profile || !job || job.status !== "open") {
    return { ok: false, reason: "That role isn't open." };
  }

  const pre = prequalify(job, profile);
  if (!pre.qualifies) {
    return { ok: false, reason: "Your profile skills don't match this role yet." };
  }

  const { assessment, source } = await assessMatch(job, profile, pre);
  if (assessment.strength === "stretch") {
    return { ok: false, reason: "Your fit for this role looks like a stretch right now." };
  }

  getDb()
    .prepare(upsert_match)
    .run({
      job_id,
      candidate_id,
      strength: assessment.strength,
      reason: assessment.reason,
      assumptions: JSON.stringify(assessment.assumptions),
      pros: JSON.stringify(assessment.pros),
      cons: JSON.stringify(assessment.cons),
      source,
      initiated_by: "candidate",
    });
  return { ok: true, reason: "You've raised your hand for this role." };
}

const match_select = `
  SELECT m.*, u.name AS candidate_name, u.headline AS candidate_headline,
         u.location AS candidate_location
  FROM matches m
  JOIN users u ON u.id = m.candidate_id
`;

export function listMatchesForJob(job_id: number): Match[] {
  const rows = getDb()
    .prepare(
      `${match_select} WHERE m.job_id = ?
       ORDER BY CASE m.strength WHEN 'strong' THEN 0 WHEN 'promising' THEN 1 ELSE 2 END,
                m.created_at DESC`,
    )
    .all(job_id) as MatchRow[];
  return rows.map(hydrateMatch);
}

export function getMatchForEmployer(employer_id: number, match_id: number): Match | null {
  const row = getDb()
    .prepare(
      `${match_select} JOIN jobs j ON j.id = m.job_id
       WHERE m.id = ? AND j.employer_id = ?`,
    )
    .get(match_id, employer_id) as MatchRow | undefined;
  return row ? hydrateMatch(row) : null;
}

export function getMatchForCandidate(candidate_id: number, match_id: number): Match | null {
  const row = getDb()
    .prepare(`${match_select} WHERE m.id = ? AND m.candidate_id = ?`)
    .get(match_id, candidate_id) as MatchRow | undefined;
  return row ? hydrateMatch(row) : null;
}

export function setMatchStatus(
  employer_id: number,
  match_id: number,
  status: "approved" | "rejected",
): Match | null {
  getDb()
    .prepare(
      `UPDATE matches SET status = ?
       WHERE id = ? AND job_id IN (SELECT id FROM jobs WHERE employer_id = ?)`,
    )
    .run(status, match_id, employer_id);
  return getMatchForEmployer(employer_id, match_id);
}

export function setCandidateReply(
  candidate_id: number,
  match_id: number,
  reply: "accepted" | "declined",
): Match | null {
  getDb()
    .prepare(
      `UPDATE matches SET candidate_reply = ?
       WHERE id = ? AND candidate_id = ? AND status = 'approved'`,
    )
    .run(reply, match_id, candidate_id);
  return getMatchForCandidate(candidate_id, match_id);
}

/**
 * Approved matches visible to a candidate — their incoming interview requests,
 * joined with the job and employer for display.
 */
export type CandidateRequest = Match & {
  job_title: string;
  employer_name: string;
  employer_company: string | null;
};

export function listRequestsForCandidate(candidate_id: number): CandidateRequest[] {
  const rows = getDb()
    .prepare(
      `SELECT m.*, u.name AS candidate_name, u.headline AS candidate_headline,
              u.location AS candidate_location,
              j.title AS job_title, emp.name AS employer_name,
              emp.company AS employer_company
       FROM matches m
       JOIN users u ON u.id = m.candidate_id
       JOIN jobs j ON j.id = m.job_id
       JOIN users emp ON emp.id = j.employer_id
       WHERE m.candidate_id = ? AND m.status = 'approved'
       ORDER BY m.created_at DESC`,
    )
    .all(candidate_id) as Array<
    MatchRow & {
      job_title: string;
      employer_name: string;
      employer_company: string | null;
    }
  >;

  return rows.map((row) => ({
    ...hydrateMatch(row),
    job_title: row.job_title,
    employer_name: row.employer_name,
    employer_company: row.employer_company,
  }));
}

export function countOpenRequests(candidate_id: number): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM matches
       WHERE candidate_id = ? AND status = 'approved' AND candidate_reply IS NULL`,
    )
    .get(candidate_id) as { n: number };
  return row.n;
}

export function matchCountsByStatus(job_id: number): {
  surfaced: number;
  approved: number;
} {
  const row = getDb()
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'surfaced' THEN 1 ELSE 0 END) AS surfaced,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved
       FROM matches WHERE job_id = ?`,
    )
    .get(job_id) as { surfaced: number | null; approved: number | null };
  return { surfaced: row.surfaced ?? 0, approved: row.approved ?? 0 };
}

export type { Job };
