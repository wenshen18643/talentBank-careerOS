import { getDb } from "@/lib/db";
import {
  type Entry,
  type EntryType,
  type ExtractedFields,
} from "@/lib/entries-core";

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

export function listEntries(user_id: number): Entry[] {
  const rows = getDb()
    .prepare(`SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC`)
    .all(user_id) as EntryRow[];
  return rows.map(hydrate);
}

export function getEntry(user_id: number, entry_id: number): Entry | null {
  const row = getDb()
    .prepare(`SELECT * FROM entries WHERE id = ? AND user_id = ?`)
    .get(entry_id, user_id) as EntryRow | undefined;
  return row ? hydrate(row) : null;
}

export function createEntry(input: {
  user_id: number;
  type: EntryType;
  raw_text: string;
  occurred_at: string | null;
}): Entry {
  const result = getDb()
    .prepare(
      `INSERT INTO entries (user_id, type, raw_text, occurred_at, status)
       VALUES (@user_id, @type, @raw_text, @occurred_at, 'raw')`,
    )
    .run(input);
  return getEntry(input.user_id, Number(result.lastInsertRowid)) as Entry;
}

export function applyRefinement(
  user_id: number,
  entry_id: number,
  fields: ExtractedFields,
): Entry | null {
  getDb()
    .prepare(
      `UPDATE entries
       SET extracted = @extracted, title = @title, status = 'refined'
       WHERE id = @id AND user_id = @user_id`,
    )
    .run({
      id: entry_id,
      user_id,
      title: fields.title,
      extracted: JSON.stringify(fields),
    });
  return getEntry(user_id, entry_id);
}

export function deleteEntry(user_id: number, entry_id: number): void {
  getDb()
    .prepare(`DELETE FROM entries WHERE id = ? AND user_id = ?`)
    .run(entry_id, user_id);
}
