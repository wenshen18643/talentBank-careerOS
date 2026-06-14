"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getMatchForCandidate, raiseHand, setCandidateReply } from "@/lib/matching";
import { addMessage } from "@/lib/messages";
import { updateCandidateProfile } from "@/lib/profile";

export type ProfileState = { error: string | null; saved: boolean };

export async function updateProfileAction(
  _prev: ProfileState,
  form_data: FormData,
): Promise<ProfileState> {
  const user = await requireRole("candidate");
  if (!user) return { error: "Only candidates have a profile.", saved: false };

  updateCandidateProfile(user.id, {
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

  const match = setCandidateReply(user.id, match_id, reply);
  if (match) {
    addMessage({
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

  const match = getMatchForCandidate(user.id, match_id);
  if (!match) return;
  addMessage({ match_id, sender_id: user.id, body });
  revalidatePath("/requests");
}
