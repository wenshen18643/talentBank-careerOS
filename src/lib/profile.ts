import { supabase } from "@/lib/db";
import { parseSkillList } from "@/lib/jobs";
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

/**
 * Adds inferred skills to a candidate's profile without disturbing the ones they
 * already chose. Returns only the skills that were newly added, so the caller
 * can tell the user exactly what their résumé contributed.
 */
export async function addCandidateSkills(
  user_id: number,
  new_skills: string[],
): Promise<string[]> {
  const incoming = filterValidSkills(new_skills);
  if (incoming.length === 0) return [];

  const { data: row } = await supabase
    .from("users")
    .select("skills")
    .eq("id", user_id)
    .eq("role", "candidate")
    .maybeSingle();
  if (!row) return [];

  const existing = parseSkillList(row.skills as string);
  const merged = filterValidSkills([...existing, ...incoming]);
  const added = merged.filter((skill) => !existing.includes(skill));
  if (added.length === 0) return [];

  await supabase
    .from("users")
    .update({ skills: JSON.stringify(merged) })
    .eq("id", user_id)
    .eq("role", "candidate");
  return added;
}
