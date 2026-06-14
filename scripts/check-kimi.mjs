/**
 * Standalone Kimi credential check. Run with the project env loaded:
 *   node --env-file=.env scripts/check-kimi.mjs
 *
 * Sends a real chat completion through the configured endpoint with the same
 * headers and model the app uses, so access gating (User-Agent) and the
 * temperature constraint are exercised — not just an auth ping.
 */

const key = process.env.KIMI_API_KEY?.trim();
const base = process.env.KIMI_BASE_URL?.trim() || "https://api.kimi.com/coding/v1";
const model = process.env.KIMI_MODEL?.trim() || "kimi-for-coding";
const temperature = process.env.KIMI_TEMPERATURE ? Number(process.env.KIMI_TEMPERATURE) : 1;
const userAgent = process.env.KIMI_USER_AGENT?.trim() || "claude-code/1.0";

if (!key) {
  console.log("KIMI_API_KEY is empty — the app will use offline refinement.");
  process.exit(0);
}

console.log(`Endpoint: ${base}\nModel:    ${model}\nUA:       ${userAgent}\n`);

try {
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "User-Agent": userAgent,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    const content = data.choices?.[0]?.message?.content ?? "(empty)";
    console.log(`✅ OK (HTTP ${response.status}). Model replied: ${content.trim().slice(0, 40)}`);
  } else {
    console.log(`❌ HTTP ${response.status}: ${data.error?.message ?? "request failed"}`);
    console.log(
      "\nCommon fixes:\n" +
        "- 401: key invalid/revoked, or wrong KIMI_BASE_URL for this key.\n" +
        "- 403 'only available for Coding Agents': set KIMI_USER_AGENT=claude-code/1.0.\n" +
        "- 400 'only 1 is allowed for this model': set KIMI_TEMPERATURE=1.",
    );
  }
} catch (error) {
  console.log(`❌ network error: ${error.message}`);
}
