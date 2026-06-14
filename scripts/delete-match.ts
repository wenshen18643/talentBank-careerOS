import { getDb } from "../src/lib/db";

const matchId = Number(process.argv[2]);
if (!Number.isInteger(matchId)) {
  console.error("Usage: npx tsx scripts/delete-match.ts <match_id>");
  process.exit(1);
}

const db = getDb();
const result = db.prepare("DELETE FROM matches WHERE id = ?").run(matchId);
console.log(`Deleted ${result.changes} match row(s) with id ${matchId}`);
