import { supabase } from "@/lib/db";
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

export function parseSkillList(raw: string): string[] {
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

export async function listJobs(employer_id: number): Promise<Job[]> {
  const { data: rows } = await supabase
    .from("jobs")
    .select("*")
    .eq("employer_id", employer_id)
    .order("created_at", { ascending: false });
  return (rows as JobRow[] | null)?.map(hydrate) ?? [];
}

export async function getJob(
  employer_id: number,
  job_id: number,
): Promise<Job | null> {
  const { data: row } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", job_id)
    .eq("employer_id", employer_id)
    .maybeSingle();
  return row ? hydrate(row as JobRow) : null;
}

export async function getJobById(job_id: number): Promise<Job | null> {
  const { data: row } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", job_id)
    .maybeSingle();
  return row ? hydrate(row as JobRow) : null;
}

type JobInput = {
  title: string;
  description: string;
  location: string | null;
  required_skills: string[];
  nice_skills: string[];
  criteria: string;
};

export async function createJob(
  employer_id: number,
  input: JobInput,
): Promise<Job> {
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      employer_id,
      title: input.title,
      description: input.description,
      location: input.location,
      required_skills: JSON.stringify(input.required_skills),
      nice_skills: JSON.stringify(input.nice_skills),
      criteria: input.criteria,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Could not create job.");
  }

  return hydrate(data as JobRow);
}

export async function updateJob(
  employer_id: number,
  job_id: number,
  input: JobInput,
): Promise<Job | null> {
  const { error } = await supabase
    .from("jobs")
    .update({
      title: input.title,
      description: input.description,
      location: input.location,
      required_skills: JSON.stringify(input.required_skills),
      nice_skills: JSON.stringify(input.nice_skills),
      criteria: input.criteria,
    })
    .eq("id", job_id)
    .eq("employer_id", employer_id);

  if (error) return null;
  return getJob(employer_id, job_id);
}

export async function deleteJob(
  employer_id: number,
  job_id: number,
): Promise<void> {
  await supabase
    .from("jobs")
    .delete()
    .eq("id", job_id)
    .eq("employer_id", employer_id);
}
