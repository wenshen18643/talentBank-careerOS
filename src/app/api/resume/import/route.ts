import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createEntry } from "@/lib/entries";
import { importResume } from "@/lib/kimi";
import { extractResumeText } from "@/lib/resume-extract";

/**
 * Imports an existing résumé into the Living Ledger. Accepts either an uploaded
 * file (PDF / txt / md) or pasted text, splits it into draft entries (Kimi, with
 * an offline fallback), and persists them as raw entries for the user to refine.
 */

const max_pasted_length = 20000;

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (user.role !== "candidate") {
    return NextResponse.json({ error: "Only candidates have a ledger." }, { status: 403 });
  }

  let resume_text: string;
  const content_type = request.headers.get("content-type") ?? "";

  if (content_type.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const pasted = form.get("text");

    if (file instanceof File && file.size > 0) {
      const extracted = await extractResumeText(file);
      if (!extracted.ok) {
        return NextResponse.json({ error: extracted.error }, { status: 422 });
      }
      resume_text = extracted.text;
    } else if (typeof pasted === "string" && pasted.trim().length >= 20) {
      resume_text = pasted.trim().slice(0, max_pasted_length);
    } else {
      return NextResponse.json(
        { error: "Add a file or paste at least a few lines of your résumé." },
        { status: 422 },
      );
    }
  } else {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const { entries: drafts, source } = await importResume(resume_text);
  if (drafts.length === 0) {
    return NextResponse.json(
      { error: "Couldn't find any entries in that résumé." },
      { status: 422 },
    );
  }

  const created = await Promise.all(
    drafts.map((draft) =>
      createEntry({
        user_id: user.id,
        type: draft.type,
        raw_text: draft.raw_text,
        occurred_at: null,
      }),
    ),
  );

  return NextResponse.json({ entries: created, count: created.length, source }, { status: 201 });
}
