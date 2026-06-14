import { describe, expect, it } from "vitest";
import {
  buildRefineMessages,
  compileCv,
  isEntryType,
  offlineRefine,
  parseRefineResponse,
  validateRawEntry,
  type Entry,
  type ExtractedFields,
} from "@/lib/entries-core";

describe("isEntryType", () => {
  it("accepts known types and rejects others", () => {
    expect(isEntryType("project")).toBe(true);
    expect(isEntryType("leadership")).toBe(true);
    expect(isEntryType("nonsense")).toBe(false);
    expect(isEntryType(42)).toBe(false);
  });
});

describe("validateRawEntry", () => {
  it("rejects text that is too short", () => {
    const result = validateRawEntry({ raw_text: "x" });
    expect(result.ok).toBe(false);
  });

  it("rejects text over the length cap", () => {
    const result = validateRawEntry({ raw_text: "a".repeat(5000) });
    expect(result.ok).toBe(false);
  });

  it("defaults an unknown type to project and trims text", () => {
    const result = validateRawEntry({ raw_text: "  led a team  ", type: "bogus" });
    expect(result).toEqual({
      ok: true,
      value: { raw_text: "led a team", type: "project", occurred_at: null },
    });
  });

  it("preserves a valid type and date", () => {
    const result = validateRawEntry({
      raw_text: "shipped the thing",
      type: "win",
      occurred_at: "2025-03-01",
    });
    expect(result.ok && result.value.type).toBe("win");
    expect(result.ok && result.value.occurred_at).toBe("2025-03-01");
  });
});

describe("parseRefineResponse", () => {
  it("parses clean JSON", () => {
    const json = JSON.stringify({
      title: "Checkout rebuild",
      impact: "Fewer failed payments",
      metrics: ["30%"],
      skills: ["queues", "payments"],
      scope: "3 months",
      bullet: "Rebuilt checkout onto a queue.",
    });
    const fields = parseRefineResponse(json);
    expect(fields.bullet).toBe("Rebuilt checkout onto a queue.");
    expect(fields.skills).toEqual(["queues", "payments"]);
  });

  it("extracts JSON wrapped in code fences and prose", () => {
    const wrapped =
      'Sure!\n```json\n{"bullet":"Did a thing","metrics":[],"skills":[]}\n```';
    const fields = parseRefineResponse(wrapped);
    expect(fields.bullet).toBe("Did a thing");
    expect(fields.metrics).toEqual([]);
  });

  it("drops non-string array members defensively", () => {
    const fields = parseRefineResponse(
      '{"bullet":"x","skills":["a",2,null,"b"],"metrics":[]}',
    );
    expect(fields.skills).toEqual(["a", "b"]);
  });

  it("throws when there is no JSON object", () => {
    expect(() => parseRefineResponse("no json here")).toThrow();
  });

  it("throws when the bullet is missing", () => {
    expect(() => parseRefineResponse('{"title":"x"}')).toThrow();
  });
});

describe("buildRefineMessages", () => {
  it("includes a system prompt and the raw text", () => {
    const messages = buildRefineMessages({ type: "project", raw_text: "fixed checkout" });
    expect(messages[0].role).toBe("system");
    expect(messages[1].content).toContain("fixed checkout");
    expect(messages[1].content).toContain("project");
  });
});

describe("offlineRefine", () => {
  it("never fabricates metrics and finds real numbers", () => {
    const fields = offlineRefine({
      type: "project",
      raw_text: "Cut error rate by 30% and saved 10 hours a week.",
    });
    expect(fields.bullet.length).toBeGreaterThan(0);
    expect(fields.metrics.join(" ")).toMatch(/30%/);
  });

  it("uses 'Led' for leadership entries", () => {
    const fields = offlineRefine({ type: "leadership", raw_text: "ran the migration" });
    expect(fields.bullet.startsWith("Led")).toBe(true);
  });

  it("does not double a verb the text already starts with", () => {
    const fields = offlineRefine({
      type: "leadership",
      raw_text: "Led the billing migration over 3 months.",
    });
    expect(fields.bullet).toBe("Led the billing migration over 3 months");
    expect(fields.bullet).not.toMatch(/Led led/i);
  });

  it("captures a multi-character unit, not just its first letter", () => {
    const fields = offlineRefine({ type: "project", raw_text: "took 3 months total" });
    expect(fields.metrics).toContain("3 months");
  });
});

function makeEntry(partial: Partial<Entry> & { id: number }): Entry {
  return {
    id: partial.id,
    user_id: 1,
    type: partial.type ?? "project",
    raw_text: partial.raw_text ?? "raw",
    title: partial.title ?? null,
    extracted: partial.extracted ?? null,
    status: partial.status ?? "raw",
    occurred_at: null,
    created_at: "2025-01-01",
  };
}

function fields(bullet: string, skills: string[]): ExtractedFields {
  return { title: bullet, impact: "", metrics: [], skills, scope: "", bullet };
}

describe("compileCv", () => {
  it("groups refined entries by type and dedupes skills", () => {
    const entries: Entry[] = [
      makeEntry({
        id: 1,
        type: "project",
        status: "refined",
        extracted: fields("Built A", ["sql", "node"]),
      }),
      makeEntry({
        id: 2,
        type: "project",
        status: "refined",
        extracted: fields("Built B", ["node"]),
      }),
      makeEntry({
        id: 3,
        type: "leadership",
        status: "refined",
        extracted: fields("Led C", ["mentoring"]),
      }),
      makeEntry({ id: 4, type: "win", status: "raw" }),
    ];
    const cv = compileCv(entries);
    expect(cv.sections.map((s) => s.type)).toEqual(["project", "leadership"]);
    expect(cv.skills).toEqual(["mentoring", "node", "sql"]);
    expect(cv.unrefined_count).toBe(1);
  });

  it("returns empty sections when nothing is refined", () => {
    const cv = compileCv([makeEntry({ id: 1, status: "raw" })]);
    expect(cv.sections).toEqual([]);
    expect(cv.unrefined_count).toBe(1);
  });
});
