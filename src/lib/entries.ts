import { supabase } from "@/lib/db";
import { type Entry, type EntryType, type ExtractedFields } from "@/lib/entries-core";

/**
 * Database-backed repository for Living Ledger entries. Rows store the
 * `extracted` field as JSON text; this module is the single place that
 * serialises and hydrates it so the rest of the app works with typed objects.
 */

type EntryRow = {
  id: number;
  user_id: number;
  type: string;
  raw_text: string;
  title: string | null;
  extracted: string | null;
  status: string;
  occurred_at: string | null;
  created_at: string;
};

/**
 * Converts a raw database row into a typed {@link Entry}, parsing the stored
 * `extracted` JSON and normalising the status to the `raw` | `refined` union.
 */
function hydrate(row: EntryRow): Entry {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type as EntryType,
    raw_text: row.raw_text,
    title: row.title,
    extracted: row.extracted ? (JSON.parse(row.extracted) as ExtractedFields) : null,
    status: row.status === "refined" ? "refined" : "raw",
    occurred_at: row.occurred_at,
    created_at: row.created_at,
  };
}

/**
 * Returns every entry owned by a user, newest first. Empty array if none.
 */
export async function listEntries(user_id: number): Promise<Entry[]> {
  const { data: rows } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });
  return (rows as EntryRow[] | null)?.map(hydrate) ?? [];
}

/**
 * Fetches a single entry scoped to its owner, so users cannot read each other's
 * entries. Returns null when it does not exist or belongs to someone else.
 */
export async function getEntry(user_id: number, entry_id: number): Promise<Entry | null> {
  const { data: row } = await supabase
    .from("entries")
    .select("*")
    .eq("id", entry_id)
    .eq("user_id", user_id)
    .maybeSingle();
  return row ? hydrate(row as EntryRow) : null;
}

/**
 * Persists a new entry in the unrefined `raw` state, ready for the AI
 * "Improve & Expand" pass. Throws if the insert fails.
 */
export async function createEntry(input: {
  user_id: number;
  type: EntryType;
  raw_text: string;
  occurred_at: string | null;
}): Promise<Entry> {
  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: input.user_id,
      type: input.type,
      raw_text: input.raw_text,
      occurred_at: input.occurred_at,
      status: "raw",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Could not create entry.");
  }

  return hydrate(data as EntryRow);
}

/**
 * Stores the AI-extracted fields against an entry the user owns and flips its
 * status to `refined`. Returns the updated entry, or null if the write failed.
 */
export async function applyRefinement(
  user_id: number,
  entry_id: number,
  fields: ExtractedFields,
): Promise<Entry | null> {
  const { error } = await supabase
    .from("entries")
    .update({
      extracted: JSON.stringify(fields),
      title: fields.title,
      status: "refined",
    })
    .eq("id", entry_id)
    .eq("user_id", user_id);

  if (error) return null;
  return getEntry(user_id, entry_id);
}

/**
 * Permanently removes an entry, scoped to its owner so one user can never
 * delete another's row.
 */
export async function deleteEntry(user_id: number, entry_id: number): Promise<void> {
  await supabase.from("entries").delete().eq("id", entry_id).eq("user_id", user_id);
}
