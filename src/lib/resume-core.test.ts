import { describe, expect, it } from "vitest";
import {
  buildImportMessages,
  offlineImport,
  parseImportResponse,
} from "@/lib/resume-core";

describe("buildImportMessages", () => {
  it("includes the resume text and forbids fabrication", () => {
    const messages = buildImportMessages("Led a team of 5.");
    expect(messages[0].content).toMatch(/never invent/i);
    expect(messages[1].content).toContain("Led a team of 5.");
  });
});

describe("parseImportResponse", () => {
  it("parses a clean entries array", () => {
    const entries = parseImportResponse(
      '{"entries":[{"type":"leadership","raw_text":"Led billing migration","title":"Billing migration"}]}',
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("leadership");
    expect(entries[0].title).toBe("Billing migration");
  });

  it("coerces unknown types to project and drops too-short text", () => {
    const entries = parseImportResponse(
      '{"entries":[{"type":"bogus","raw_text":"Shipped the new dashboard"},{"type":"win","raw_text":"x"}]}',
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("project");
  });

  it("throws when there is no entries array", () => {
    expect(() => parseImportResponse('{"nope":true}')).toThrow();
  });
});

describe("offlineImport", () => {
  const resume = `EXPERIENCE
- Led the migration off our legacy billing system over three months.
- Decided to deprecate the v1 API after measuring adoption.
- Built a new analytics dashboard used across the company.
ada@example.com
EDUCATION
BSc`;

  it("splits bullets into classified entries and drops headers/contacts", () => {
    const entries = offlineImport(resume);
    const texts = entries.map((e) => e.raw_text);
    expect(texts.some((t) => t.startsWith("Led the migration"))).toBe(true);
    expect(texts.some((t) => t.includes("@example.com"))).toBe(false);
    expect(texts.some((t) => t === "EXPERIENCE" || t === "EDUCATION")).toBe(false);
  });

  it("classifies by leading verb", () => {
    const entries = offlineImport(resume);
    const led = entries.find((e) => e.raw_text.startsWith("Led"));
    const decided = entries.find((e) => e.raw_text.startsWith("Decided"));
    expect(led?.type).toBe("leadership");
    expect(decided?.type).toBe("decision");
  });
});
