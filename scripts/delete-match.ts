import { supabase } from "../src/lib/db";

async function main() {
  const matchId = Number(process.argv[2]);
  if (!Number.isInteger(matchId)) {
    console.error("Usage: npx tsx scripts/delete-match.ts <match_id>");
    process.exit(1);
  }

  const { error, count } = await supabase
    .from("matches")
    .delete({ count: "exact" })
    .eq("id", matchId);

  if (error) {
    console.error("Delete failed:", error.message);
    process.exit(1);
  }

  console.log(`Deleted ${count ?? 0} match row(s) with id ${matchId}`);
}

main();
