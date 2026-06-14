"use client";

import type { EntryType } from "@/lib/entries-core";
import { ArrowIcon } from "@/components/icons";

type CvModel = {
  name: string;
  headline: string;
  location: string | null;
  skills: string[];
  sections: Array<{
    type: EntryType;
    label: string;
    bullets: Array<{ id: number; bullet: string; title: string }>;
  }>;
};

/**
 * Download controls for the compiled CV: "Download PDF" uses the browser's
 * print pipeline against a print stylesheet, and "Download Markdown" builds a
 * portable .md file client-side. No PDF dependency, no server round-trip.
 */
export default function CvActions({ cv }: { cv: CvModel }) {
  function downloadMarkdown() {
    const lines: string[] = [`# ${cv.name}`];
    const meta = [cv.headline, cv.location].filter(Boolean).join(" · ");
    if (meta) lines.push(`*${meta}*`);
    if (cv.skills.length > 0) {
      lines.push("", "## Skills", cv.skills.join(" · "));
    }
    for (const section of cv.sections) {
      lines.push("", `## ${section.label}`);
      for (const item of section.bullets) {
        lines.push(`- **${item.title}** — ${item.bullet}`);
      }
    }
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(cv.name)}-cv.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      <button type="button" className="btn btn-primary" onClick={() => window.print()}>
        Download PDF
        <ArrowIcon width={16} height={16} />
      </button>
      <button type="button" className="btn btn-ghost" onClick={downloadMarkdown}>
        Download Markdown
      </button>
    </div>
  );
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "candidate";
}
