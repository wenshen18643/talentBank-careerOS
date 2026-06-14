"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  findJobMatches,
  getMatchForCandidate,
  raiseHand,
  setCandidateReply,
  type JobMatch,
} from "@/lib/matching";
import { addMessage } from "@/lib/messages";
import { updateCandidateProfile } from "@/lib/profile";

export type ProfileState = { error: string | null; saved: boolean };

export async function updateProfileAction(
  _prev: ProfileState,
  form_data: FormData,
): Promise<ProfileState> {
  const user = await requireRole("candidate");
  if (!user) return { error: "Only candidates have a profile.", saved: false };

  await updateCandidateProfile(user.id, {
    headline: String(form_data.get("headline") ?? ""),
    location: String(form_data.get("location") ?? ""),
    skills: form_data.getAll("skills").map(String),
  });

  revalidatePath("/profile");
  revalidatePath("/discover");
  revalidatePath("/cv");
  return { error: null, saved: true };
}

export async function raiseHandAction(form_data: FormData): Promise<void> {
  const user = await requireRole("candidate");
  if (!user) return;
  const job_id = Number(form_data.get("job_id"));
  if (!Number.isInteger(job_id)) return;
  await raiseHand(user.id, job_id);
  revalidatePath("/discover");
}

export type FindJobsState = { ran: boolean; matches: JobMatch[] };

/**
 * Runs the candidate-side matching engine over open roles and returns the worded
 * fits for rendering. Results are ephemeral by design — nothing is written until
 * the candidate deliberately raises their hand on a role.
 */
export async function findJobMatchesAction(
  _prev: FindJobsState,
  _form_data: FormData,
): Promise<FindJobsState> {
  const user = await requireRole("candidate");
  if (!user) return { ran: true, matches: [] };
  return { ran: true, matches: await findJobMatches(user.id) };
}

export type RaiseHandState = { ok: boolean; message: string };

/**
 * Stateful raise-hand used by the assessed match cards so the button can report
 * its own outcome inline (entered the pipeline, or why it couldn't).
 */
export async function expressInterestAction(
  _prev: RaiseHandState,
  form_data: FormData,
): Promise<RaiseHandState> {
  const user = await requireRole("candidate");
  if (!user) return { ok: false, message: "Sign in as a candidate to do that." };
  const job_id = Number(form_data.get("job_id"));
  if (!Number.isInteger(job_id)) return { ok: false, message: "Unknown role." };

  const result = await raiseHand(user.id, job_id);
  revalidatePath("/discover");
  return { ok: result.ok, message: result.reason };
}

/**
 * Server actions for the candidate side of an approved request: accept or
 * decline an employer's outreach, and reply in the thread. The candidate role
 * is re-checked server-side on every call.
 */

export async function respondToRequestAction(form_data: FormData): Promise<void> {
  const user = await requireRole("candidate");
  if (!user) return;

  const match_id = Number(form_data.get("match_id"));
  const reply = String(form_data.get("reply"));
  if (!Number.isInteger(match_id) || (reply !== "accepted" && reply !== "declined")) {
    return;
  }

  const match = await setCandidateReply(user.id, match_id, reply);
  if (match) {
    await addMessage({
      match_id,
      sender_id: user.id,
      body:
        reply === "accepted"
          ? "Thanks for reaching out — I'm open to a conversation. Happy to share times."
          : "Thank you for thinking of me. The timing isn't right for me just now, but I appreciate it.",
    });
  }
  revalidatePath("/requests");
}

export async function candidateReplyAction(form_data: FormData): Promise<void> {
  const user = await requireRole("candidate");
  if (!user) return;
  const match_id = Number(form_data.get("match_id"));
  const body = String(form_data.get("body") ?? "").trim();
  if (!Number.isInteger(match_id) || !body) return;

  const match = await getMatchForCandidate(user.id, match_id);
  if (!match) return;
  await addMessage({ match_id, sender_id: user.id, body });
  revalidatePath("/requests");
}
