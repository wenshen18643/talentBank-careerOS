import { getDb } from "../src/lib/db";

const db = getDb();

const matches = db
  .prepare(
    `SELECT m.id, m.job_id, m.candidate_id, m.status, m.strength,
            m.reason, m.source, m.initiated_by,
            j.title AS job_title, u.name AS candidate_name
     FROM matches m
     JOIN jobs j ON j.id = m.job_id
     JOIN users u ON u.id = m.candidate_id`,
  )
  .all();

console.log(JSON.stringify(matches, null, 2));
