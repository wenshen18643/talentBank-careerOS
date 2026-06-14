import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Singleton SQLite handle for the Career OS prototype.
 *
 * The connection is cached on `globalThis` so Next.js hot-reloads in
 * development do not open a new file handle (and re-run migrations) on
 * every request. The schema is created idempotently on first access.
 */

const database_file_path = join(process.cwd(), "data", "career-os.db");

type GlobalWithDb = typeof globalThis & { __career_os_db?: Database.Database };
const global_with_db = globalThis as GlobalWithDb;

function createConnection(): Database.Database {
  mkdirSync(dirname(database_file_path), { recursive: true });
  const connection = new Database(database_file_path);
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  migrate(connection);
  return connection;
}

function migrate(connection: Database.Database): void {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'candidate',
      password    TEXT NOT NULL,
      headline    TEXT,
      location    TEXT,
      company     TEXT,
      skills      TEXT NOT NULL DEFAULT '[]',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entries (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type         TEXT NOT NULL DEFAULT 'project',
      raw_text     TEXT NOT NULL,
      title        TEXT,
      extracted    TEXT,
      status       TEXT NOT NULL DEFAULT 'raw',
      occurred_at  TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS jobs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      description     TEXT NOT NULL DEFAULT '',
      location        TEXT,
      required_skills TEXT NOT NULL DEFAULT '[]',
      nice_skills     TEXT NOT NULL DEFAULT '[]',
      criteria        TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'open',
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS matches (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id        INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      candidate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status        TEXT NOT NULL DEFAULT 'surfaced',
      strength      TEXT NOT NULL DEFAULT 'promising',
      reason        TEXT NOT NULL DEFAULT '',
      assumptions   TEXT NOT NULL DEFAULT '[]',
      pros          TEXT NOT NULL DEFAULT '[]',
      cons          TEXT NOT NULL DEFAULT '[]',
      source        TEXT NOT NULL DEFAULT 'offline',
      initiated_by  TEXT NOT NULL DEFAULT 'engine',
      candidate_reply TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (job_id, candidate_id)
    );

    CREATE INDEX IF NOT EXISTS idx_matches_job ON matches(job_id, status);
    CREATE INDEX IF NOT EXISTS idx_matches_candidate ON matches(candidate_id, status);

    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
  `);

  ensureColumn(connection, "users", "skills", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(connection, "matches", "initiated_by", "TEXT NOT NULL DEFAULT 'engine'");
  ensureColumn(connection, "matches", "pros", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(connection, "matches", "cons", "TEXT NOT NULL DEFAULT '[]'");
}

/**
 * Adds a column to a table only if it is missing, so older databases upgrade in
 * place without a destructive migration. SQLite has no `ADD COLUMN IF NOT
 * EXISTS`, hence the pragma check.
 */
function ensureColumn(
  connection: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const columns = connection.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((c) => c.name === column)) {
    connection.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function getDb(): Database.Database {
  if (!global_with_db.__career_os_db) {
    global_with_db.__career_os_db = createConnection();
  }
  return global_with_db.__career_os_db;
}

/**
 * Closes and forgets the cached connection. Used by tests so the database file
 * is unlocked and can be removed; not needed in normal app runtime.
 */
export function closeDb(): void {
  global_with_db.__career_os_db?.close();
  global_with_db.__career_os_db = undefined;
}
