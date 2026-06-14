import { afterAll, describe, expect, it } from "vitest";

/**
 * Integration test for the matching engine against a real Supabase project. It
 * seeds candidates (with refined entries), recruiters, and jobs, then drives the
 * full gatekeeper → assess → approve → reply flow. Runs offline (no Kimi key in
 * the test env), so the assessment uses the deterministic fallback.
 *
 * The suite self-skips unless Supabase credentials are present, so `npm test`
 * stays green in environments without a configured test database. All rows it
 * creates are removed afterwards by cascade-deleting the seeded users, so it
 * never pollutes the shared project.
 */

const has_supabase_credentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const run_suffix = Math.floor(Math.random() * 1_000_000).toString(36);
const seeded_emails: string[] = [];

function testEmail(handle: string): string {
  const email = `${handle}-${run_suffix}@integration.test`;
  seeded_emails.push(email);
  return email;
}

afterAll(async () => {
  if (!has_supabase_credentials || seeded_emails.length === 0) return;
  const { supabase } = await import("@/lib/db");
  await supabase.from("users").delete().in("email", seeded_emails);
});

describe.skipIf(!has_supabase_credentials)("matching engine (integration)", () => {
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

    const candidate = await createUser({
      email: testEmail("cand"),
      name: "Ada Lovelace",
      password: "password123",
      role: "candidate",
    });
    const recruiter = await createUser({
      email: testEmail("rec"),
      name: "Grace Hopper",
      password: "password123",
      role: "recruiter",
      company: "Acme",
    });
    expect(candidate.ok && recruiter.ok).toBe(true);
    if (!candidate.ok || !recruiter.ok) return;

    await updateCandidateProfile(candidate.id, {
      headline: "Senior Engineer",
      location: "Kuala Lumpur",
      skills: ["Payments Infrastructure", "Reliability Engineering", "Distributed Systems"],
    });

    const entry = await createEntry({
      user_id: candidate.id,
      type: "leadership",
      raw_text: "Owned payments reliability; moved checkout onto a queue.",
      occurred_at: null,
    });
    await applyRefinement(candidate.id, entry.id, {
      title: "Payments reliability",
      impact: "Fewer failed charges",
      metrics: ["40%"],
      skills: ["Payments Infrastructure"],
      scope: "3 months",
      bullet: "Re-architected checkout onto an async queue, cutting peak failures.",
    });

    const job = await createJob(recruiter.id, {
      title: "Staff Engineer, Payments",
      description: "Own payments reliability.",
      location: "Kuala Lumpur",
      required_skills: ["Payments Infrastructure", "Reliability Engineering"],
      nice_skills: ["Distributed Systems"],
      criteria: "Senior moving into staff-level ownership.",
    });

    const summary = await runMatching(recruiter.id, job.id);
    expect(summary.surfaced).toBe(1);

    const surfaced = await listMatchesForJob(job.id);
    expect(surfaced).toHaveLength(1);
    expect(surfaced[0].candidate_id).toBe(candidate.id);
    expect(surfaced[0].strength).toBe("strong");
    expect(surfaced[0].source).toBe("offline");
    expect(surfaced[0].reason).toMatch(/payments/i);

    const approved = await setMatchStatus(recruiter.id, surfaced[0].id, "approved");
    expect(approved?.status).toBe("approved");

    await addMessage({
      match_id: surfaced[0].id,
      sender_id: recruiter.id,
      body: "Your logged work stood out — keen to talk.",
    });

    expect(await countOpenRequests(candidate.id)).toBe(1);
    const requests = await listRequestsForCandidate(candidate.id);
    expect(requests).toHaveLength(1);
    expect(requests[0].job_title).toBe("Staff Engineer, Payments");
    expect(requests[0].employer_company).toBe("Acme");

    await setCandidateReply(candidate.id, surfaced[0].id, "accepted");
    expect(await countOpenRequests(candidate.id)).toBe(0);

    const thread = await listMessages(surfaced[0].id);
    expect(thread.length).toBeGreaterThanOrEqual(1);

    const rerun = await runMatching(recruiter.id, job.id);
    expect(rerun.surfaced).toBe(1);
    const afterRerun = await listMatchesForJob(job.id);
    expect(afterRerun[0].status).toBe("approved");
    expect(afterRerun[0].candidate_reply).toBe("accepted");
  });

  it("lets a qualified candidate raise their hand on an open role", async () => {
    const { createUser } = await import("@/lib/users");
    const { updateCandidateProfile } = await import("@/lib/profile");
    const { createJob } = await import("@/lib/jobs");
    const { listDiscoverJobs, raiseHand, listMatchesForJob } = await import("@/lib/matching");

    const candidate = await createUser({
      email: testEmail("cand2"),
      name: "Linus T",
      password: "password123",
      role: "candidate",
    });
    const recruiter = await createUser({
      email: testEmail("rec2"),
      name: "Margaret H",
      password: "password123",
      role: "recruiter",
      company: "Globex",
    });
    if (!candidate.ok || !recruiter.ok) throw new Error("seed failed");

    await updateCandidateProfile(candidate.id, {
      headline: "Frontend Engineer",
      location: "Selangor",
      skills: ["Frontend Development", "UI Design"],
    });

    const job = await createJob(recruiter.id, {
      title: "Senior Frontend Engineer",
      description: "Own the design system.",
      location: "Selangor",
      required_skills: ["Frontend Development"],
      nice_skills: ["UI Design"],
      criteria: "Growing into design-system ownership.",
    });

    const discover = await listDiscoverJobs(candidate.id);
    expect(discover.some((j) => j.id === job.id && j.pipeline_status === "none")).toBe(true);

    const result = await raiseHand(candidate.id, job.id);
    expect(result.ok).toBe(true);

    const matches = await listMatchesForJob(job.id);
    const ourMatch = matches.find((m) => m.candidate_id === candidate.id);
    expect(ourMatch).toBeDefined();
    expect(ourMatch?.initiated_by).toBe("candidate");

    const afterDiscover = await listDiscoverJobs(candidate.id);
    expect(afterDiscover.find((j) => j.id === job.id)?.pipeline_status).toBe("surfaced");
  });
});
