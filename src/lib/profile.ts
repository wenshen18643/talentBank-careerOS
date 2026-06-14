import { getDb } from "@/lib/db";
import { canonicalLocation, filterValidSkills } from "@/lib/taxonomy";

/**
 * Candidate profile updates. Skills and location are forced through the
 * controlled vocabularies before persistence, so off-list values can never
 * enter the matching surface.
 */

export function updateCandidateProfile(
  user_id: number,
  input: { headline: string; location: string; skills: string[] },
): void {
  const headline = input.headline.trim().slice(0, 120) || null;
  const location = canonicalLocation(input.location);
  const skills = filterValidSkills(input.skills);

  getDb()
    .prepare(
      `UPDATE users SET headline = ?, location = ?, skills = ? WHERE id = ? AND role = 'candidate'`,
    )
    .run(headline, location, JSON.stringify(skills), user_id);
}
