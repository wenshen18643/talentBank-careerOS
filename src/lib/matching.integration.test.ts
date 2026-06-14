import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { closeDb } from "@/lib/db";

/**
 * Integration test for the matching engine against a real SQLite database. It
 * seeds a candidate (with a refined entry), a recruiter, and a job, then drives
 * the full gatekeeper → assess → approve → reply flow. Runs offline (no Kimi
 * key in the test env), so the assessment uses the deterministic fallback.
 *
 * The on-disk database is removed afterwards so it never pollutes the dev DB.
 */

const db_files = ["career-os.db", "career-os.db-shm", "career-os.db-wal"];

function cleanup() {
  closeDb();
  for (const file of db_files) {
    try {
      rmSync(join(process.cwd(), "data", file), { force: true });
    } catch {
      // Best-effort: on Windows/OneDrive the file can stay briefly locked after
      // close. Leaving the dev DB behind is harmless (it's gitignored).
    }
  }
}

beforeAll(cleanup);
afterAll(cleanup);

describe("matching engine (integration)", () => {
  it("runs the full surface → approve → reply flow", async () => {
    const { createUser } = await import("@/lib/users");
    const { updateCandidateProfile } = await import("@/lib/profile");
    const { createEntry, applyRefinement } = await import("@/lib/entries");
    const { createJob } = await import("@/lib/jobs");
    const {
      runMatching,
      listMatchesForJob,
      setMatchStatus,
      setCandidateReply,
      listRequestsForCandidate,
      countOpenRequests,
    } = await import("@/lib/matching");
    const { listMessages, addMessage } = await import("@/lib/messages");

    const candidate = createUser({
      email: "cand@test.dev",
      name: "Ada Lovelace",
      password: "password123",
      role: "candidate",
    });
    const recruiter = createUser({
      email: "rec@test.dev",
      name: "Grace Hopper",
      password: "password123",
      role: "recruiter",
      company: "Acme",
    });
    expect(candidate.ok && recruiter.ok).toBe(true);
    if (!candidate.ok || !recruiter.ok) return;

    updateCandidateProfile(candidate.id, {
      headline: "Senior Engineer",
      location: "Kuala Lumpur",
      skills: ["Payments Infrastructure", "Reliability Engineering", "Distributed Systems"],
    });

    const entry = createEntry({
      user_id: candidate.id,
      type: "leadership",
      raw_text: "Owned payments reliability; moved checkout onto a queue.",
      occurred_at: null,
    });
    applyRefinement(candidate.id, entry.id, {
      title: "Payments reliability",
      impact: "Fewer failed charges",
      metrics: ["40%"],
      skills: ["Payments Infrastructure"],
      scope: "3 months",
      bullet: "Re-architected checkout onto an async queue, cutting peak failures.",
    });

    const job = createJob(recruiter.id, {
      title: "Staff Engineer, Payments",
      description: "Own payments reliability.",
      location: "Kuala Lumpur",
      required_skills: ["Payments Infrastructure", "Reliability Engineering"],
      nice_skills: ["Distributed Systems"],
      criteria: "Senior moving into staff-level ownership.",
    });

    const summary = await runMatching(recruiter.id, job.id);
    expect(summary.surfaced).toBe(1);

    const surfaced = listMatchesForJob(job.id);
    expect(surfaced).toHaveLength(1);
    expect(surfaced[0].candidate_id).toBe(candidate.id);
    expect(surfaced[0].strength).toBe("strong");
    expect(surfaced[0].source).toBe("offline");
    expect(surfaced[0].reason).toMatch(/payments/i);

    const approved = setMatchStatus(recruiter.id, surfaced[0].id, "approved");
    expect(approved?.status).toBe("approved");

    addMessage({
      match_id: surfaced[0].id,
      sender_id: recruiter.id,
      body: "Your logged work stood out — keen to talk.",
    });

    expect(countOpenRequests(candidate.id)).toBe(1);
    const requests = listRequestsForCandidate(candidate.id);
    expect(requests).toHaveLength(1);
    expect(requests[0].job_title).toBe("Staff Engineer, Payments");
    expect(requests[0].employer_company).toBe("Acme");

    setCandidateReply(candidate.id, surfaced[0].id, "accepted");
    expect(countOpenRequests(candidate.id)).toBe(0);

    const thread = listMessages(surfaced[0].id);
    expect(thread.length).toBeGreaterThanOrEqual(1);

    const rerun = await runMatching(recruiter.id, job.id);
    expect(rerun.surfaced).toBe(1);
    const afterRerun = listMatchesForJob(job.id);
    expect(afterRerun[0].status).toBe("approved");
    expect(afterRerun[0].candidate_reply).toBe("accepted");
  });

  it("lets a qualified candidate raise their hand on an open role", async () => {
    const { createUser } = await import("@/lib/users");
    const { updateCandidateProfile } = await import("@/lib/profile");
    const { createJob } = await import("@/lib/jobs");
    const { listDiscoverJobs, raiseHand, listMatchesForJob } = await import("@/lib/matching");

    const candidate = createUser({
      email: "cand2@test.dev",
      name: "Linus T",
      password: "password123",
      role: "candidate",
    });
    const recruiter = createUser({
      email: "rec2@test.dev",
      name: "Margaret H",
      password: "password123",
      role: "recruiter",
      company: "Globex",
    });
    if (!candidate.ok || !recruiter.ok) throw new Error("seed failed");

    updateCandidateProfile(candidate.id, {
      headline: "Frontend Engineer",
      location: "Selangor",
      skills: ["Frontend Development", "UI Design"],
    });

    const job = createJob(recruiter.id, {
      title: "Senior Frontend Engineer",
      description: "Own the design system.",
      location: "Selangor",
      required_skills: ["Frontend Development"],
      nice_skills: ["UI Design"],
      criteria: "Growing into design-system ownership.",
    });

    const discover = listDiscoverJobs(candidate.id);
    expect(discover.some((j) => j.id === job.id && j.pipeline_status === "none")).toBe(true);

    const result = await raiseHand(candidate.id, job.id);
    expect(result.ok).toBe(true);

    const matches = listMatchesForJob(job.id);
    expect(matches).toHaveLength(1);
    expect(matches[0].candidate_id).toBe(candidate.id);
    expect(matches[0].initiated_by).toBe("candidate");

    const afterDiscover = listDiscoverJobs(candidate.id);
    expect(afterDiscover.find((j) => j.id === job.id)?.pipeline_status).toBe("surfaced");
  });
});
