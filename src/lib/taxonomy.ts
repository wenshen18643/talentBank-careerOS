/**
 * Controlled vocabularies for the platform. Skills and locations are fixed lists
 * shared by both sides: employers pick job criteria from the same set candidates
 * pick their profile from, so matching compares like-for-like with no fuzzy
 * string guessing. Locations are Malaysia-only (states + federal territories).
 */

export const skill_groups: ReadonlyArray<{ label: string; skills: readonly string[] }> = [
  {
    label: "Engineering",
    skills: [
      "Frontend Development",
      "Backend Development",
      "Mobile Development",
      "DevOps",
      "Cloud Infrastructure",
      "Distributed Systems",
      "Reliability Engineering",
      "Security Engineering",
      "QA & Testing",
      "Payments Infrastructure",
    ],
  },
  {
    label: "Data & AI",
    skills: [
      "Data Engineering",
      "Data Analysis",
      "Machine Learning",
      "Data Science",
      "Business Intelligence",
      "Database Administration",
    ],
  },
  {
    label: "Product & Design",
    skills: [
      "Product Management",
      "Product Design",
      "UX Research",
      "UI Design",
      "Design Systems",
      "Technical Writing",
    ],
  },
  {
    label: "Business & Operations",
    skills: [
      "Project Management",
      "Operations",
      "Sales",
      "Marketing",
      "Customer Success",
      "Finance",
      "Human Resources",
      "Procurement",
    ],
  },
  {
    label: "Leadership",
    skills: [
      "People Management",
      "Team Leadership",
      "Strategy",
      "Stakeholder Management",
      "Hiring & Mentoring",
    ],
  },
] as const;

export const skills: readonly string[] = skill_groups.flatMap((group) => group.skills);

const skill_set = new Set(skills.map((skill) => skill.toLowerCase()));

export function isValidSkill(value: string): boolean {
  return skill_set.has(value.trim().toLowerCase());
}

/**
 * Keeps only recognised skills from an arbitrary input list, normalised to their
 * canonical casing and de-duplicated. Anything off-list is dropped.
 */
export function filterValidSkills(values: string[]): string[] {
  const canonical = new Map(skills.map((skill) => [skill.toLowerCase(), skill]));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const match = canonical.get(value.trim().toLowerCase());
    if (match && !seen.has(match)) {
      seen.add(match);
      result.push(match);
    }
  }
  return result;
}

export const malaysia_locations: readonly string[] = [
  "Kuala Lumpur",
  "Selangor",
  "Putrajaya",
  "Johor",
  "Penang",
  "Perak",
  "Negeri Sembilan",
  "Melaka",
  "Pahang",
  "Kedah",
  "Kelantan",
  "Terengganu",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Labuan",
  "Remote (Malaysia)",
] as const;

const location_set = new Set(
  malaysia_locations.map((location) => location.toLowerCase()),
);

export function isValidLocation(value: string): boolean {
  return location_set.has(value.trim().toLowerCase());
}

/**
 * Returns the canonical location string for an input, or null if it isn't a
 * recognised Malaysian location.
 */
export function canonicalLocation(value: string | null | undefined): string | null {
  if (!value) return null;
  const canonical = new Map(
    malaysia_locations.map((location) => [location.toLowerCase(), location]),
  );
  return canonical.get(value.trim().toLowerCase()) ?? null;
}
