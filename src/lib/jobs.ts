import { getDb } from "@/lib/db";
import type { JobCriteria } from "@/lib/matching-core";

/**
 * Repository for employer job listings. Skill arrays are stored as JSON text;
 * this module serialises and hydrates them so callers work with typed objects.
 */

export type Job = JobCriteria & {
  id: number;
  employer_id: number;
  status: "open" | "closed";
  created_at: string;
};

type JobRow = {
  id: number;
  employer_id: number;
  title: string;
  description: string;
  location: string | null;
  required_skills: string;
  nice_skills: string;
  criteria: string;
  status: string;
  created_at: string;
};

function parseSkillList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

function hydrate(row: JobRow): Job {
  return {
    id: row.id,
    employer_id: row.employer_id,
    title: row.title,
    description: row.description,
    location: row.location,
    required_skills: parseSkillList(row.required_skills),
    nice_skills: parseSkillList(row.nice_skills),
    criteria: row.criteria,
    status: row.status === "closed" ? "closed" : "open",
    created_at: row.created_at,
  };
}

export function listJobs(employer_id: number): Job[] {
  const rows = getDb()
    .prepare(`SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC`)
    .all(employer_id) as JobRow[];
  return rows.map(hydrate);
}

export function getJob(employer_id: number, job_id: number): Job | null {
  const row = getDb()
    .prepare(`SELECT * FROM jobs WHERE id = ? AND employer_id = ?`)
    .get(job_id, employer_id) as JobRow | undefined;
  return row ? hydrate(row) : null;
}

export function getJobById(job_id: number): Job | null {
  const row = getDb()
    .prepare(`SELECT * FROM jobs WHERE id = ?`)
    .get(job_id) as JobRow | undefined;
  return row ? hydrate(row) : null;
}

type JobInput = {
  title: string;
  description: string;
  location: string | null;
  required_skills: string[];
  nice_skills: string[];
  criteria: string;
};

export function createJob(employer_id: number, input: JobInput): Job {
  const result = getDb()
    .prepare(
      `INSERT INTO jobs (employer_id, title, description, location, required_skills, nice_skills, criteria)
       VALUES (@employer_id, @title, @description, @location, @required_skills, @nice_skills, @criteria)`,
    )
    .run({
      employer_id,
      title: input.title,
      description: input.description,
      location: input.location,
      required_skills: JSON.stringify(input.required_skills),
      nice_skills: JSON.stringify(input.nice_skills),
      criteria: input.criteria,
    });
  return getJobById(Number(result.lastInsertRowid)) as Job;
}

export function updateJob(
  employer_id: number,
  job_id: number,
  input: JobInput,
): Job | null {
  getDb()
    .prepare(
      `UPDATE jobs SET title=@title, description=@description, location=@location,
        required_skills=@required_skills, nice_skills=@nice_skills, criteria=@criteria
       WHERE id=@id AND employer_id=@employer_id`,
    )
    .run({
      id: job_id,
      employer_id,
      title: input.title,
      description: input.description,
      location: input.location,
      required_skills: JSON.stringify(input.required_skills),
      nice_skills: JSON.stringify(input.nice_skills),
      criteria: input.criteria,
    });
  return getJob(employer_id, job_id);
}

export function deleteJob(employer_id: number, job_id: number): void {
  getDb()
    .prepare(`DELETE FROM jobs WHERE id = ? AND employer_id = ?`)
    .run(job_id, employer_id);
}
