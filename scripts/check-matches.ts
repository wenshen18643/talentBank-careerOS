import { supabase } from "../src/lib/db";

async function main() {
  const { data: matches } = await supabase
    .from("matches")
    .select(
      `id, job_id, candidate_id, status, strength, reason, source, initiated_by,
       jobs!inner(title),
       users!inner(name)`,
    )
    .order("id");

  console.log(JSON.stringify(matches, null, 2));
}

main();
