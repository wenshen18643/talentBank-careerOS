import { describe, expect, it } from "vitest";
import {
  buildMatchMessages,
  gradeStrength,
  offlineMatch,
  parseMatchResponse,
  prequalify,
  type CandidateProfile,
  type JobCriteria,
} from "@/lib/matching-core";

function job(partial: Partial<JobCriteria> = {}): JobCriteria {
  return {
    title: "Staff Engineer, Payments",
    description: "Own payments reliability.",
    location: "Remote",
    required_skills: ["payments", "reliability"],
    nice_skills: ["queues", "go"],
    criteria: "Senior moving into staff-level ownership.",
    ...partial,
  };
}

function candidate(skills: string[], bullets: string[] = []): CandidateProfile {
  return {
    id: 1,
    name: "Ada Lovelace",
    headline: "Senior Engineer",
    location: "Remote",
    skills,
    bullets,
  };
}

describe("prequalify (the gatekeeper)", () => {
  it("qualifies on a single required-skill overlap", () => {
    const pre = prequalify(job(), candidate(["payments", "node"]));
    expect(pre.qualifies).toBe(true);
    expect(pre.matched_required).toEqual(["payments"]);
    expect(pre.missing_required).toEqual(["reliability"]);
  });

  it("rejects when no required skill overlaps", () => {
    const pre = prequalify(job(), candidate(["react", "css"]));
    expect(pre.qualifies).toBe(false);
  });

  it("is case-insensitive on skill names", () => {
    const pre = prequalify(job(), candidate(["Payments", "RELIABILITY"]));
    expect(pre.qualifies).toBe(true);
    expect(pre.matched_required.length).toBe(2);
    expect(pre.missing_required).toEqual([]);
  });

  it("falls back to two nice-to-haves when a job lists no required skills", () => {
    const open = job({ required_skills: [] });
    expect(prequalify(open, candidate(["queues"])).qualifies).toBe(false);
    expect(prequalify(open, candidate(["queues", "go"])).qualifies).toBe(true);
  });
});

describe("gradeStrength", () => {
  it("is strong when all required plus a nice-to-have are present", () => {
    const c = candidate(["payments", "reliability", "queues"]);
    expect(gradeStrength(job(), prequalify(job(), c))).toBe("strong");
  });

  it("is promising at half the required skills", () => {
    const c = candidate(["payments"]);
    expect(gradeStrength(job(), prequalify(job(), c))).toBe("promising");
  });

  it("is a stretch below half the required skills", () => {
    const big = job({ required_skills: ["a", "b", "c", "d"] });
    const c = candidate(["a"]);
    expect(gradeStrength(big, prequalify(big, c))).toBe("stretch");
  });
});

describe("offlineMatch", () => {
  it("states overlap, cites a logged bullet, and names the gap, with no score", () => {
    const c = candidate(["payments"], ["Rebuilt checkout onto a queue."]);
    const assessment = offlineMatch(job(), c, prequalify(job(), c));
    expect(assessment.reason).toMatch(/payments/i);
    expect(assessment.reason).toMatch(/Rebuilt checkout/);
    expect(assessment.reason).toMatch(/reliability/i);
    expect(assessment.reason).not.toMatch(/\d+%/);
    expect(assessment.assumptions.length).toBeGreaterThan(0);
  });
});

describe("buildMatchMessages", () => {
  it("grounds the prompt in overlap and forbids a numeric score", () => {
    const c = candidate(["payments"], ["Did a thing"]);
    const messages = buildMatchMessages(job(), c, prequalify(job(), c));
    expect(messages[0].content).toMatch(/never output a numeric score/i);
    expect(messages[1].content).toMatch(/payments/);
    expect(messages[1].content).toMatch(/Did a thing/);
  });
});

describe("parseMatchResponse", () => {
  it("parses a clean assessment", () => {
    const assessment = parseMatchResponse(
      '{"strength":"strong","reason":"Clear fit on payments.","assumptions":["Inferred seniority"]}',
    );
    expect(assessment.strength).toBe("strong");
    expect(assessment.reason).toBe("Clear fit on payments.");
    expect(assessment.assumptions).toEqual(["Inferred seniority"]);
  });

  it("defaults an unknown strength to promising", () => {
    const assessment = parseMatchResponse('{"strength":"perfect","reason":"x"}');
    expect(assessment.strength).toBe("promising");
  });

  it("tolerates code fences", () => {
    const assessment = parseMatchResponse('```json\n{"strength":"stretch","reason":"Maybe."}\n```');
    expect(assessment.strength).toBe("stretch");
    expect(assessment.assumptions).toEqual([]);
  });

  it("throws when the reason is missing", () => {
    expect(() => parseMatchResponse('{"strength":"strong"}')).toThrow();
  });
});
