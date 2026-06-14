"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createJob, deleteJob, getJob, updateJob } from "@/lib/jobs";
import { canonicalLocation, filterValidSkills } from "@/lib/taxonomy";
import {
  getMatchForEmployer,
  runMatching,
  setMatchStatus,
} from "@/lib/matching";
import { addMessage, listMessages } from "@/lib/messages";

/**
 * Server actions for the employer surface: job authoring, running the matching
 * engine, and acting on surfaced candidates. Every action re-checks the
 * recruiter role server-side; the UI gate is not the security boundary.
 */

export type JobFormState = { error: string | null; saved?: boolean };

function readJobInput(form_data: FormData) {
  return {
    title: String(form_data.get("title") ?? "").trim(),
    description: String(form_data.get("description") ?? "").trim(),
    location: canonicalLocation(String(form_data.get("location") ?? "")),
    required_skills: filterValidSkills(form_data.getAll("required_skills").map(String)),
    nice_skills: filterValidSkills(form_data.getAll("nice_skills").map(String)),
    criteria: String(form_data.get("criteria") ?? "").trim(),
  };
}

export async function createJobAction(
  _prev: JobFormState,
  form_data: FormData,
): Promise<JobFormState> {
  const user = await requireRole("recruiter");
  if (!user) return { error: "Only recruiters can post roles." };

  const input = readJobInput(form_data);
  if (input.title.length < 3) {
    return { error: "Give the role a title." };
  }

  const job = await createJob(user.id, input);
  revalidatePath("/employer");
  redirect(`/employer/jobs/${job.id}`);
}

export async function updateJobAction(
  _prev: JobFormState,
  form_data: FormData,
): Promise<JobFormState> {
  const user = await requireRole("recruiter");
  if (!user) return { error: "Only recruiters can edit roles." };

  const job_id = Number(form_data.get("job_id"));
  if (!Number.isInteger(job_id)) return { error: "Unknown role." };

  const input = readJobInput(form_data);
  if (input.title.length < 3) return { error: "Give the role a title." };

  await updateJob(user.id, job_id, input);
  revalidatePath(`/employer/jobs/${job_id}`);
  revalidatePath("/employer");
  return { error: null, saved: true };
}

export async function deleteJobAction(form_data: FormData): Promise<void> {
  const user = await requireRole("recruiter");
  if (!user) return;
  const job_id = Number(form_data.get("job_id"));
  if (Number.isInteger(job_id)) await deleteJob(user.id, job_id);
  revalidatePath("/employer");
  redirect("/employer");
}

export async function runMatchingAction(form_data: FormData): Promise<void> {
  const user = await requireRole("recruiter");
  if (!user) return;
  const job_id = Number(form_data.get("job_id"));
  if (!Number.isInteger(job_id)) return;
  await runMatching(user.id, job_id);
  revalidatePath(`/employer/jobs/${job_id}`);
}

export async function decideMatchAction(form_data: FormData): Promise<void> {
  const user = await requireRole("recruiter");
  if (!user) return;

  const match_id = Number(form_data.get("match_id"));
  const decision = String(form_data.get("decision"));
  if (!Number.isInteger(match_id) || (decision !== "approved" && decision !== "rejected")) {
    return;
  }

  const match = await setMatchStatus(user.id, match_id, decision);

  if (match && decision === "approved" && (await listMessages(match.id)).length === 0) {
    const job = await getJob(user.id, match.job_id);
    await addMessage({
      match_id: match.id,
      sender_id: user.id,
      body:
        `Hi ${match.candidate_name.split(" ")[0]} — your logged work stood out for our ${job?.title ?? "open"} role. ` +
        `Here's what caught our eye: ${match.reason} ` +
        `If the timing's right, I'd love to find 20 minutes to talk. No pressure either way.`,
    });
  }

  if (match) revalidatePath(`/employer/jobs/${match.job_id}`);
}

export async function employerReplyAction(form_data: FormData): Promise<void> {
  const user = await requireRole("recruiter");
  if (!user) return;
  const match_id = Number(form_data.get("match_id"));
  const body = String(form_data.get("body") ?? "").trim();
  if (!Number.isInteger(match_id) || !body) return;

  const match = await getMatchForEmployer(user.id, match_id);
  if (!match) return;
  await addMessage({ match_id, sender_id: user.id, body });
  revalidatePath(`/employer/jobs/${match.job_id}`);
}

