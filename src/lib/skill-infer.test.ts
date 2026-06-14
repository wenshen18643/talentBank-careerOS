import { describe, expect, it } from "vitest";
import { inferSkillsOffline, parseSkillResponse } from "@/lib/skill-infer";
import { isValidSkill } from "@/lib/taxonomy";

describe("inferSkillsOffline", () => {
  it("maps résumé keywords onto canonical taxonomy skills", () => {
    const resume = `Built a React frontend and a Node.js backend.
    Owned the CI/CD pipeline with Docker and Kubernetes.
    Led a team of four engineers and mentored two juniors.`;
    const inferred = inferSkillsOffline(resume);
    expect(inferred).toContain("Frontend Development");
    expect(inferred).toContain("Backend Development");
    expect(inferred).toContain("DevOps");
    expect(inferred).toContain("Team Leadership");
    expect(inferred).toContain("Hiring & Mentoring");
  });

  it("only ever returns valid, de-duplicated taxonomy skills", () => {
    const inferred = inferSkillsOffline("react React REACT frontend tailwind css");
    expect(inferred.every(isValidSkill)).toBe(true);
    expect(new Set(inferred).size).toBe(inferred.length);
  });

  it("infers nothing from text with no recognised skills", () => {
    expect(inferSkillsOffline("I enjoy long walks and gardening.")).toEqual([]);
  });

  it("does not match keywords that are mere substrings of other words", () => {
    expect(inferSkillsOffline("We reacted to the cssetic redesign.")).toEqual([]);
  });
});

describe("parseSkillResponse", () => {
  it("keeps on-list skills and drops hallucinated ones", () => {
    const skills = parseSkillResponse(
      '{"skills":["Machine Learning","Telepathy","Backend Development"]}',
    );
    expect(skills).toContain("Machine Learning");
    expect(skills).toContain("Backend Development");
    expect(skills).not.toContain("Telepathy");
  });

  it("throws when the response has no JSON object", () => {
    expect(() => parseSkillResponse("not json")).toThrow();
  });
});
