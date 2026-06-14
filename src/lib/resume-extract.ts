import pdfParse from "pdf-parse/lib/pdf-parse.js";

/**
 * Extracts plain text from an uploaded résumé file. PDFs are parsed with
 * pdf-parse; plain-text and markdown files are read directly. Returns a result
 * object rather than throwing, so the route can answer with a clean error.
 */

const max_text_length = 20000;
const supported_note = "Upload a PDF, .txt, or .md file, or paste the text.";

export async function extractResumeText(
  file: File,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const name = file.name.toLowerCase();
  const is_pdf = name.endsWith(".pdf") || file.type === "application/pdf";

  try {
    let text: string;
    if (is_pdf) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      text = await file.text();
    } else {
      return { ok: false, error: supported_note };
    }

    const cleaned = text
      .replace(/\r\n/g, "\n")
      .replace(/\f/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (cleaned.length < 20) {
      return { ok: false, error: "Couldn't read enough text from that file." };
    }
    return { ok: true, text: cleaned.slice(0, max_text_length) };
  } catch {
    return { ok: false, error: `That file couldn't be parsed. ${supported_note}` };
  }
}
