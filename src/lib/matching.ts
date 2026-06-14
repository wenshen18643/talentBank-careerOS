import { supabase } from "@/lib/db";
import { getJob, getJobById, hydrateJob, type Job, type JobRow } from "@/lib/jobs";
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

async function collectBullets(candidate_id: number): Promise<string[]> {
  const { data: rows } = await supabase
    .from("entries")
    .select("extracted")
    .eq("user_id", candidate_id)
    .eq("status", "refined");
  const bullets: string[] = [];
  for (const row of (rows as Array<{ extracted: string | null }> | null) ?? []) {
    if (!row.extracted) continue;
    const fields = JSON.parse(row.extracted) as ExtractedFields;
    if (fields.bullet) bullets.push(fields.bullet);
  }
  return bullets;
}

async function toProfile(row: CandidateRow): Promise<CandidateProfile> {
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
    bullets: await collectBullets(row.id),
  };
}

/**
 * Builds a profile for every candidate who has declared at least one skill from
 * the controlled vocabulary. Skills are the canonical, on-list profile skills —
 * the matching surface — while bullets come from refined ledger entries as
 * evidence for the assessment.
 */
async function candidateProfiles(): Promise<CandidateProfile[]> {
  const { data: rows } = await supabase
    .from("users")
    .select("id, name, headline, location, skills")
    .eq("role", "candidate")
    .neq("skills", "[]")
    .not("skills", "is", null);
  return await Promise.all(((rows as CandidateRow[] | null) ?? []).map(toProfile));
}

async function getCandidateProfile(
  candidate_id: number,
): Promise<CandidateProfile | null> {
  const { data: row } = await supabase
    .from("users")
    .select("id, name, headline, location, skills")
    .eq("id", candidate_id)
    .eq("role", "candidate")
    .maybeSingle();
  return row ? toProfile(row as CandidateRow) : null;
}

type MatchInsert = {
  job_id: number;
  candidate_id: number;
  status: "surfaced";
  strength: MatchStrength;
  reason: string;
  assumptions: string;
  pros: string;
  cons: string;
  source: "kimi" | "offline";
  initiated_by: "engine" | "candidate";
};

async function upsertSurfacedMatch(payload: MatchInsert): Promise<void> {
  const { data: existing } = await supabase
    .from("matches")
    .select("status, initiated_by")
    .eq("job_id", payload.job_id)
    .eq("candidate_id", payload.candidate_id)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "surfaced") return;
    await supabase
      .from("matches")
      .update({
        strength: payload.strength,
        reason: payload.reason,
        assumptions: payload.assumptions,
        pros: payload.pros,
        cons: payload.cons,
        source: payload.source,
        initiated_by:
          payload.initiated_by === "candidate" ? "candidate" : existing.initiated_by,
      })
      .eq("job_id", payload.job_id)
      .eq("candidate_id", payload.candidate_id);
    return;
  }

  await supabase.from("matches").insert(payload);
}

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
  const job = await getJob(employer_id, job_id);
  if (!job) throw new Error("Job not found.");

  const profiles = await candidateProfiles();
  let surfaced = 0;

  for (const candidate of profiles) {
    const pre = prequalify(job, candidate);
    if (!pre.qualifies) continue;

    const { assessment, source } = await assessMatch(job, candidate, pre);
    if (assessment.strength === "stretch") continue;

    await upsertSurfacedMatch({
      job_id: job.id,
      candidate_id: candidate.id,
      status: "surfaced",
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

export async function listDiscoverJobs(candidate_id: number): Promise<DiscoverJob[]> {
  const profile = await getCandidateProfile(candidate_id);
  if (!profile || profile.skills.length === 0) return [];

  const [{ data: rows }, { data: pipelineRows }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, users!inner(company)")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase.from("matches").select("job_id, status").eq("candidate_id", candidate_id),
  ]);

  const typedRows =
    (rows as unknown as Array<JobRow & { users: { company: string | null } }> | null) ??
    [];
  const pipeline = new Map(
    ((pipelineRows as Array<{ job_id: number; status: string }> | null) ?? []).map(
      (row) => [row.job_id, row.status],
    ),
  );

  const result: DiscoverJob[] = [];
  for (const row of typedRows) {
    const job = hydrateJob(row);
    const pre = prequalify(job, profile);
    if (!pre.qualifies) continue;
    const status = pipeline.get(job.id);
    result.push({
      ...job,
      employer_company: row.users?.company ?? null,
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
 * A single open role assessed for one candidate: the worded fit, the
 * plain-language reason, and where they already stand in that role's pipeline.
 * The candidate-facing analogue of an employer's surfaced `Match`.
 */
export type JobMatch = {
  job_id: number;
  title: string;
  employer_company: string | null;
  location: string | null;
  matched_skills: string[];
  strength: MatchStrength;
  reason: string;
  pros: string[];
  cons: string[];
  source: "kimi" | "offline";
  pipeline_status: "none" | "surfaced" | "approved" | "rejected";
};

/**
 * Candidate-side mirror of the employer engine. For every open role the
 * candidate's on-list skills qualify for, it generates a worded assessment
 * (Kimi or offline) grounded in their logged work — their experience and
 * imported resume — and returns the credible fits ranked strongest first.
 *
 * Deliberately read-only: surfacing into an employer's pipeline is the explicit
 * `raiseHand` step, so running this never spams anyone. Stretch fits are
 * dropped for the same honesty the employer engine applies.
 */
export async function findJobMatches(candidate_id: number): Promise<JobMatch[]> {
  const profile = await getCandidateProfile(candidate_id);
  if (!profile || profile.skills.length === 0) return [];

  const [{ data: rows }, { data: pipelineRows }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, users!inner(company)")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase.from("matches").select("job_id, status").eq("candidate_id", candidate_id),
  ]);

  const typedRows =
    (rows as unknown as Array<JobRow & { users: { company: string | null } }> | null) ??
    [];
  const pipeline = new Map(
    ((pipelineRows as Array<{ job_id: number; status: string }> | null) ?? []).map(
      (row) => [row.job_id, row.status],
    ),
  );

  const result: JobMatch[] = [];
  for (const row of typedRows) {
    const job = hydrateJob(row);
    const pre = prequalify(job, profile);
    if (!pre.qualifies) continue;

    const { assessment, source } = await assessMatch(job, profile, pre);
    if (assessment.strength === "stretch") continue;

    const status = pipeline.get(job.id);
    result.push({
      job_id: job.id,
      title: job.title,
      employer_company: row.users?.company ?? null,
      location: job.location,
      matched_skills: [...pre.matched_required, ...pre.matched_nice],
      strength: assessment.strength,
      reason: assessment.reason,
      pros: assessment.pros,
      cons: assessment.cons,
      source,
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

  const strength_rank = { strong: 0, promising: 1, stretch: 2 };
  return result.sort((a, b) => strength_rank[a.strength] - strength_rank[b.strength]);
}

export type AutoApplyResult = { applied: number; skipped: number };

/**
 * Raises the candidate's hand across many roles in one pass — the auto-apply
 * path. Each role still goes through `raiseHand`, so the same qualify-and-assess
 * gate applies per role and a slipped fit is skipped rather than forced through.
 */
export async function autoApply(
  candidate_id: number,
  job_ids: number[],
): Promise<AutoApplyResult> {
  let applied = 0;
  let skipped = 0;
  for (const job_id of job_ids) {
    const { ok } = await raiseHand(candidate_id, job_id);
    if (ok) applied += 1;
    else skipped += 1;
  }
  return { applied, skipped };
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
  const profile = await getCandidateProfile(candidate_id);
  const job = await getJobById(job_id);
  if (!profile || !job || job.status !== "open") {
    return { ok: false, reason: "That role isn't open." };
  }

  const pre = prequalify(job, profile);
  if (!pre.qualifies) {
    return { ok: false, reason: "Your profile skills don't match this role yet." };
  }

  const { assessment, source } = await assessMatch(job, profile, pre);
  if (assessment.strength === "stretch") {
    return {
      ok: false,
      reason: "Your fit for this role looks like a stretch right now.",
    };
  }

  await upsertSurfacedMatch({
    job_id,
    candidate_id,
    status: "surfaced",
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

const matchSelect = `
  id,
  job_id,
  candidate_id,
  status,
  strength,
  reason,
  assumptions,
  pros,
  cons,
  source,
  initiated_by,
  candidate_reply,
  created_at,
  users!inner(name, headline, location)
`;

type MatchSelectRow = {
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
  users: { name: string; headline: string | null; location: string | null };
};

function flattenMatchRow(row: MatchSelectRow): MatchRow {
  return {
    id: row.id,
    job_id: row.job_id,
    candidate_id: row.candidate_id,
    status: row.status,
    strength: row.strength,
    reason: row.reason,
    assumptions: row.assumptions,
    pros: row.pros,
    cons: row.cons,
    source: row.source,
    initiated_by: row.initiated_by,
    candidate_reply: row.candidate_reply,
    created_at: row.created_at,
    candidate_name: row.users?.name ?? "",
    candidate_headline: row.users?.headline ?? null,
    candidate_location: row.users?.location ?? null,
  };
}

export async function listMatchesForJob(job_id: number): Promise<Match[]> {
  const { data: rows } = await supabase
    .from("matches")
    .select(matchSelect)
    .eq("job_id", job_id)
    .order("strength", { ascending: true })
    .order("created_at", { ascending: false });
  const customOrder = { strong: 0, promising: 1, stretch: 2 };
  return ((rows as unknown as MatchSelectRow[] | null)?.map(flattenMatchRow) ?? [])
    .sort(
      (a, b) =>
        (customOrder[a.strength as keyof typeof customOrder] ?? 2) -
          (customOrder[b.strength as keyof typeof customOrder] ?? 2) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map(hydrateMatch);
}

export async function getMatchForEmployer(
  employer_id: number,
  match_id: number,
): Promise<Match | null> {
  const { data: row } = await supabase
    .from("matches")
    .select(`${matchSelect}, jobs!inner(employer_id)`)
    .eq("id", match_id)
    .eq("jobs.employer_id", employer_id)
    .maybeSingle();
  return row ? hydrateMatch(flattenMatchRow(row as unknown as MatchSelectRow)) : null;
}

export async function getMatchForCandidate(
  candidate_id: number,
  match_id: number,
): Promise<Match | null> {
  const { data: row } = await supabase
    .from("matches")
    .select(matchSelect)
    .eq("id", match_id)
    .eq("candidate_id", candidate_id)
    .maybeSingle();
  return row ? hydrateMatch(flattenMatchRow(row as unknown as MatchSelectRow)) : null;
}

export async function setMatchStatus(
  employer_id: number,
  match_id: number,
  status: "approved" | "rejected",
): Promise<Match | null> {
  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id")
    .eq("employer_id", employer_id);
  const jobIds = ((jobRows as Array<{ id: number }> | null) ?? []).map((r) => r.id);
  if (jobIds.length === 0) return null;

  await supabase
    .from("matches")
    .update({ status })
    .eq("id", match_id)
    .in("job_id", jobIds);

  return getMatchForEmployer(employer_id, match_id);
}

export async function setCandidateReply(
  candidate_id: number,
  match_id: number,
  reply: "accepted" | "declined",
): Promise<Match | null> {
  await supabase
    .from("matches")
    .update({ candidate_reply: reply })
    .eq("id", match_id)
    .eq("candidate_id", candidate_id)
    .eq("status", "approved");

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

export async function listRequestsForCandidate(
  candidate_id: number,
): Promise<CandidateRequest[]> {
  const { data: rows } = await supabase
    .from("matches")
    .select(matchSelect)
    .eq("candidate_id", candidate_id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const matches =
    (rows as unknown as MatchSelectRow[] | null)
      ?.map(flattenMatchRow)
      .map(hydrateMatch) ?? [];
  if (matches.length === 0) return [];

  const jobIds = matches.map((m) => m.job_id);
  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, title, employer_id, users!inner(name, company)")
    .in("id", jobIds);

  const jobMap = new Map(
    (
      (jobRows as unknown as Array<{
        id: number;
        title: string;
        employer_id: number;
        users: { name: string; company: string | null };
      }> | null) ?? []
    ).map((j) => [
      j.id,
      {
        title: j.title,
        employer_name: j.users?.name ?? "",
        employer_company: j.users?.company ?? null,
      },
    ]),
  );

  return matches.map((m) => ({
    ...m,
    job_title: jobMap.get(m.job_id)?.title ?? "",
    employer_name: jobMap.get(m.job_id)?.employer_name ?? "",
    employer_company: jobMap.get(m.job_id)?.employer_company ?? null,
  }));
}

export async function countOpenRequests(candidate_id: number): Promise<number> {
  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", candidate_id)
    .eq("status", "approved")
    .is("candidate_reply", null);
  return count ?? 0;
}

export async function matchCountsByStatus(job_id: number): Promise<{
  surfaced: number;
  approved: number;
}> {
  const [{ count: surfaced }, { count: approved }] = await Promise.all([
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("job_id", job_id)
      .eq("status", "surfaced"),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("job_id", job_id)
      .eq("status", "approved"),
  ]);
  return { surfaced: surfaced ?? 0, approved: approved ?? 0 };
}

export type { Job };
