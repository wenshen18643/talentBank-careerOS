import { supabase } from "@/lib/db";
import { canonicalLocation, filterValidSkills } from "@/lib/taxonomy";

/**
 * Candidate profile updates. Skills and location are forced through the
 * controlled vocabularies before persistence, so off-list values can never
 * enter the matching surface.
 */

export async function updateCandidateProfile(
  user_id: number,
  input: { headline: string; location: string; skills: string[] },
): Promise<void> {
  const headline = input.headline.trim().slice(0, 120) || null;
  const location = canonicalLocation(input.location);
  const skills = filterValidSkills(input.skills);

  await supabase
    .from("users")
    .update({ headline, location, skills: JSON.stringify(skills) })
    .eq("id", user_id)
    .eq("role", "candidate");
}
