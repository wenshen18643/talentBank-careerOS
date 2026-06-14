import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteEntry, getEntry } from "@/lib/entries";

/**
 * Deletes one Living Ledger entry owned by the signed-in user.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await context.params;
  const entry_id = Number(id);
  if (!Number.isInteger(entry_id) || !(await getEntry(user.id, entry_id))) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  await deleteEntry(user.id, entry_id);
  return NextResponse.json({ ok: true });
}
