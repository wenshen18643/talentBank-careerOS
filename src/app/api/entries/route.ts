import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createEntry } from "@/lib/entries";
import { validateRawEntry } from "@/lib/entries-core";

/**
 * Creates a new raw Living Ledger entry for the signed-in user. Refinement is a
 * separate, explicit step so logging stays instant and friction-free.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validated = validateRawEntry(body as Record<string, unknown>);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 422 });
  }

  const entry = await createEntry({ user_id: user.id, ...validated.value });
  return NextResponse.json({ entry }, { status: 201 });
}
