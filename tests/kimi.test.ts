import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assessMatch, importResume, inferProfileSkills, refineEntry } from "@/lib/kimi";
import { prequalify, type CandidateProfile, type JobCriteria } from "@/lib/matching-core";

/**
 * Builds a fetch stub that resolves to a chat-completion envelope wrapping
 * `content` as the assistant message, mirroring the Kimi API response shape.
 */
function okFetch(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

function failFetch(status = 500) {
  return vi.fn().mockResolvedValue({ ok: false, status });
}

const sample_job: JobCriteria = {
  title: "Staff Engineer, Payments",
  description: "Own payments reliability.",
  location: "Remote",
  required_skills: ["payments"],
  nice_skills: ["go"],
  criteria: "Senior moving into staff ownership.",
};

const sample_candidate: CandidateProfile = {
  id: 1,
  name: "Ada Lovelace",
  headline: "Senior Engineer",
  location: "Remote",
  skills: ["payments", "go"],
  bullets: ["Led the payments reliability rewrite, cutting incidents."],
};

const original_env = { ...process.env };

/**
 * Sets the Kimi API key for the current test, or clears it to exercise the
 * offline fallback path. Reset to the real environment after every test.
 */
function setApiKey(value: string | null): void {
  if (value === null) delete process.env.KIMI_API_KEY;
  else process.env.KIMI_API_KEY = value;
}

beforeEach(() => {
  process.env.KIMI_BASE_URL = "https://example.test/v1";
  process.env.KIMI_MODEL = "test-model";
});

afterEach(() => {
  process.env = { ...original_env };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("refineEntry", () => {
  it("returns Kimi-sourced fields when the API succeeds", async () => {
    setApiKey("test-key");
    const fetchMock = okFetch(
      '{"title":"Payments rewrite","impact":"Fewer incidents","metrics":[],"skills":["payments"],"scope":"","bullet":"Rewrote the payments path"}',
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await refineEntry({ type: "project", raw_text: "rewrote payments" });

    expect(result.source).toBe("kimi");
    expect(result.fields.bullet).toBe("Rewrote the payments path");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back to offline refinement when no API key is set", async () => {
    setApiKey(null);
    const fetchMock = okFetch("{}");
    vi.stubGlobal("fetch", fetchMock);

    const result = await refineEntry({
      type: "project",
      raw_text: "Shipped the onboarding redesign.",
    });

    expect(result.source).toBe("offline");
    expect(result.note).toMatch(/No KIMI_API_KEY/);
    expect(result.fields.bullet.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to offline when the API call fails", async () => {
    setApiKey("test-key");
    vi.stubGlobal("fetch", failFetch(503));

    const result = await refineEntry({
      type: "project",
      raw_text: "Shipped the onboarding redesign.",
    });

    expect(result.source).toBe("offline");
    expect(result.note).toMatch(/failed/i);
  });
});

describe("assessMatch", () => {
  it("returns a Kimi assessment when the API succeeds", async () => {
    setApiKey("test-key");
    vi.stubGlobal(
      "fetch",
      okFetch(
        '{"strength":"strong","reason":"Direct payments overlap.","assumptions":["Senior"],"pros":["Owned payments"],"cons":["No Go in prod"]}',
      ),
    );
    const pre = prequalify(sample_job, sample_candidate);

    const result = await assessMatch(sample_job, sample_candidate, pre);

    expect(result.source).toBe("kimi");
    expect(result.assessment.strength).toBe("strong");
    expect(result.assessment.reason).toContain("payments");
  });

  it("falls back to a deterministic offline assessment without a key", async () => {
    setApiKey(null);
    const pre = prequalify(sample_job, sample_candidate);

    const result = await assessMatch(sample_job, sample_candidate, pre);

    expect(result.source).toBe("offline");
    expect(result.assessment.strength).toBeDefined();
  });
});

describe("importResume", () => {
  it("returns parsed entries when the API succeeds", async () => {
    setApiKey("test-key");
    vi.stubGlobal(
      "fetch",
      okFetch(
        '{"entries":[{"type":"leadership","raw_text":"Led the payments team","title":"Led payments"}]}',
      ),
    );

    const result = await importResume("Led the payments team for three years.");

    expect(result.source).toBe("kimi");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].type).toBe("leadership");
  });

  it("falls back to the offline splitter without a key", async () => {
    setApiKey(null);

    const result = await importResume(
      "Led the payments team for three years.\nShipped onboarding redesign last quarter.",
    );

    expect(result.source).toBe("offline");
    expect(result.entries.length).toBeGreaterThan(0);
  });
});

describe("inferProfileSkills", () => {
  it("merges model skills with the offline matcher when a key is set", async () => {
    setApiKey("test-key");
    vi.stubGlobal("fetch", okFetch('{"skills":["payments"]}'));

    const result = await inferProfileSkills("Worked on payments systems.");

    expect(result.source).toBe("kimi");
    expect(Array.isArray(result.skills)).toBe(true);
  });

  it("uses only the offline matcher without a key", async () => {
    setApiKey(null);
    const fetchMock = okFetch("{}");
    vi.stubGlobal("fetch", fetchMock);

    const result = await inferProfileSkills("Worked on payments systems.");

    expect(result.source).toBe("offline");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
