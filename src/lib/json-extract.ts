/**
 * Extracts the first balanced top-level JSON object from arbitrary text,
 * tolerating code fences and surrounding prose that language models often add.
 * Returns the raw object substring, or null if none is found. String-aware so
 * braces inside string literals don't throw off the depth count.
 */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let in_string = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (in_string) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') in_string = false;
      continue;
    }
    if (char === '"') in_string = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
