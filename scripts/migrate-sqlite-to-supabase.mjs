import { createClient } from "@supabase/supabase-js";
import { DatabaseSync } from "node:sqlite";

/**
 * One-time data migration from the legacy local SQLite database
 * (`data/career-os.db`) to the Supabase Postgres project.
 *
 * Primary keys are NOT preserved: each row is re-inserted and its new
 * server-assigned id is captured into an old -> new map, so foreign keys are
 * rewritten as the data lands. This keeps the Postgres identity sequences
 * correct (a forced-id copy would leave them at 1 and collide with the next
 * real signup).
 *
 * Tables are migrated in dependency order: users -> entries / jobs ->
 * matches -> messages. Run once against an EMPTY schema:
 *
 *   node --env-file=.env scripts/migrate-sqlite-to-supabase.mjs
 *
 * Re-running against populated tables will fail on the unique email constraint
 * by design, so it cannot silently duplicate data.
 */

const sqlite_path = "data/career-os.db";
const insert_chunk_size = 200;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const db = new DatabaseSync(sqlite_path, { readOnly: true });

function readTable(table) {
  return db.prepare(`SELECT * FROM ${table} ORDER BY id`).all();
}

function stripId(row) {
  const { id, ...rest } = row;
  return rest;
}

async function assertEmpty() {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(
      `Cannot reach Supabase tables — apply 001_initial_schema.sql first. (${error.message})`,
    );
  }
  if ((count ?? 0) > 0) {
    throw new Error(
      `Refusing to migrate: 'users' already has ${count} rows. Wipe the Supabase data first.`,
    );
  }
}

/**
 * Inserts rows whose new ids must be captured, returning an old-id -> new-id
 * map. Insertion is sequential per chunk so the returned order matches the
 * input order and ids can be zipped back to their source rows.
 */
async function insertWithIdMap(table, rows) {
  const id_map = new Map();
  for (let offset = 0; offset < rows.length; offset += insert_chunk_size) {
    const chunk = rows.slice(offset, offset + insert_chunk_size);
    const { data, error } = await supabase
      .from(table)
      .insert(chunk.map((row) => stripId(row)))
      .select("id");
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    if (data.length !== chunk.length) {
      throw new Error(
        `${table}: expected ${chunk.length} returned ids, got ${data.length}`,
      );
    }
    chunk.forEach((row, index) => id_map.set(row.id, data[index].id));
  }
  return id_map;
}

async function insertLeaf(table, rows) {
  for (let offset = 0; offset < rows.length; offset += insert_chunk_size) {
    const chunk = rows.slice(offset, offset + insert_chunk_size);
    const { error } = await supabase
      .from(table)
      .insert(chunk.map((row) => stripId(row)));
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

function remap(id_map, old_id) {
  const next = id_map.get(old_id);
  if (next === undefined) throw new Error(`Unmapped foreign key id: ${old_id}`);
  return next;
}

async function main() {
  await assertEmpty();

  const users = readTable("users");
  const user_ids = await insertWithIdMap("users", users);
  console.log(`users: ${user_ids.size} migrated`);

  const entries = readTable("entries").map((row) => ({
    ...row,
    user_id: remap(user_ids, row.user_id),
  }));
  await insertLeaf("entries", entries);
  console.log(`entries: ${entries.length} migrated`);

  const jobs = readTable("jobs").map((row) => ({
    ...row,
    employer_id: remap(user_ids, row.employer_id),
  }));
  const job_ids = await insertWithIdMap("jobs", jobs);
  console.log(`jobs: ${job_ids.size} migrated`);

  const matches = readTable("matches").map((row) => ({
    ...row,
    job_id: remap(job_ids, row.job_id),
    candidate_id: remap(user_ids, row.candidate_id),
  }));
  const match_ids = await insertWithIdMap("matches", matches);
  console.log(`matches: ${match_ids.size} migrated`);

  const messages = readTable("messages").map((row) => ({
    ...row,
    match_id: remap(match_ids, row.match_id),
    sender_id: remap(user_ids, row.sender_id),
  }));
  await insertLeaf("messages", messages);
  console.log(`messages: ${messages.length} migrated`);

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
