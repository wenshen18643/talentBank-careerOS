import { describe, expect, it } from "vitest";
import { extractResumeText } from "@/lib/resume-extract";

function textFile(content: string, name = "cv.txt", type = "text/plain"): File {
  return new File([content], name, { type });
}

describe("extractResumeText", () => {
  it("reads a plain-text résumé and normalises whitespace", async () => {
    const file = textFile("Senior Engineer\r\n\n\n\nLed payments team for three years.");
    const result = await extractResumeText(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe("Senior Engineer\n\nLed payments team for three years.");
    }
  });

  it("accepts markdown by extension", async () => {
    const file = textFile(
      "# Resume\n\nShipped onboarding redesign last quarter.",
      "cv.md",
      "",
    );
    const result = await extractResumeText(file);
    expect(result.ok).toBe(true);
  });

  it("rejects unsupported file types", async () => {
    const file = textFile("binary-ish", "photo.png", "image/png");
    const result = await extractResumeText(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Upload a PDF");
  });

  it("rejects files with too little readable text", async () => {
    const file = textFile("hi", "cv.txt");
    const result = await extractResumeText(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/enough text/i);
  });

  it("returns a clean error instead of throwing on an unparseable PDF", async () => {
    const file = new File(["not a real pdf"], "cv.pdf", { type: "application/pdf" });
    const result = await extractResumeText(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("couldn't be parsed");
  });
});
