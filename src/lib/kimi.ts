import {
  buildRefineMessages,
  offlineRefine,
  parseRefineResponse,
  type EntryType,
  type ExtractedFields,
} from "@/lib/entries-core";
import {
  buildMatchMessages,
  offlineMatch,
  parseMatchResponse,
  type CandidateProfile,
  type JobCriteria,
  type MatchAssessment,
  type Prequalification,
} from "@/lib/matching-core";
import {
  buildImportMessages,
  offlineImport,
  parseImportResponse,
  type ImportedEntry,
} from "@/lib/resume-core";

/**
 * Kimi (Moonshot) client for the AI features. Both engines — the Living
 * Ledger's "Improve & Expand" and the matching reason — share one chat call and
 * one fallback policy: if no API key is configured, or the call fails, a
 * deterministic offline result is returned and the `source` says so. The app is
 * never blocked on the network.
 */

type ChatMessage = { role: "system" | "user"; content: string };

const request_timeout_ms = Number(process.env.KIMI_TIMEOUT_MS) || 60000;

export type RefineResult = {
  fields: ExtractedFields;
  source: "kimi" | "offline";
  note?: string;
};

export type MatchResult = {
  assessment: MatchAssessment;
  source: "kimi" | "offline";
};

export type ImportResult = {
  entries: ImportedEntry[];
  source: "kimi" | "offline";
};

export async function refineEntry(entry: {
  type: EntryType;
  raw_text: string;
}): Promise<RefineResult> {
  const api_key = getApiKey();
  if (!api_key) {
    return {
      fields: offlineRefine(entry),
      source: "offline",
      note: "No KIMI_API_KEY set — using built-in offline refinement.",
    };
  }
  try {
    const content = await chatJson(api_key, buildRefineMessages(entry));
    return { fields: parseRefineResponse(content), source: "kimi" };
  } catch (error) {
    return {
      fields: offlineRefine(entry),
      source: "offline",
      note: `Kimi call failed (${(error as Error).message}); used offline refinement.`,
    };
  }
}

export async function assessMatch(
  job: JobCriteria,
  candidate: CandidateProfile,
  pre: Prequalification,
): Promise<MatchResult> {
  const api_key = getApiKey();
  if (!api_key) {
    return { assessment: offlineMatch(job, candidate, pre), source: "offline" };
  }
  try {
    const content = await chatJson(api_key, buildMatchMessages(job, candidate, pre));
    return { assessment: parseMatchResponse(content), source: "kimi" };
  } catch {
    return { assessment: offlineMatch(job, candidate, pre), source: "offline" };
  }
}

export async function importResume(resume_text: string): Promise<ImportResult> {
  const api_key = getApiKey();
  if (!api_key) {
    return { entries: offlineImport(resume_text), source: "offline" };
  }
  try {
    const content = await chatJson(api_key, buildImportMessages(resume_text));
    return { entries: parseImportResponse(content), source: "kimi" };
  } catch {
    return { entries: offlineImport(resume_text), source: "offline" };
  }
}

function getApiKey(): string | null {
  const key = process.env.KIMI_API_KEY?.trim();
  return key ? key : null;
}

async function chatJson(api_key: string, messages: ChatMessage[]): Promise<string> {
  const base_url = process.env.KIMI_BASE_URL?.trim() || "https://api.kimi.com/coding/v1";
  const model = process.env.KIMI_MODEL?.trim() || "kimi-for-coding";
  const temperature = process.env.KIMI_TEMPERATURE
    ? Number(process.env.KIMI_TEMPERATURE)
    : 1;
  const user_agent = process.env.KIMI_USER_AGENT?.trim() || "claude-code/1.0";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request_timeout_ms);
  try {
    const response = await fetch(`${base_url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
        "User-Agent": user_agent,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty completion");
    return content;
  } finally {
    clearTimeout(timer);
  }
}
