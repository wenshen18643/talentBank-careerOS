import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyRefinement, getEntry } from "@/lib/entries";
import { refineEntry } from "@/lib/kimi";

/**
 * Runs the "Improve & Expand" engine on one entry and persists the result.
 * Returns the refined entry plus a `source` flag so the UI can be honest about
 * whether Kimi or the offline fallback produced the bullet.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await context.params;
  const entry_id = Number(id);
  if (!Number.isInteger(entry_id)) {
    return NextResponse.json({ error: "Bad entry id." }, { status: 400 });
  }

  const entry = await getEntry(user.id, entry_id);
  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const result = await refineEntry({ type: entry.type, raw_text: entry.raw_text });
  const updated = await applyRefinement(user.id, entry_id, result.fields);
  return NextResponse.json({ entry: updated, source: result.source, note: result.note });
}
