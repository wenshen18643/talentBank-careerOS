import { describe, expect, it } from "vitest";
import {
  canonicalLocation,
  filterValidSkills,
  isValidLocation,
  isValidSkill,
  malaysia_locations,
  skills,
} from "@/lib/taxonomy";

describe("skills vocabulary", () => {
  it("recognises on-list skills case-insensitively", () => {
    expect(isValidSkill("Frontend Development")).toBe(true);
    expect(isValidSkill("frontend development")).toBe(true);
    expect(isValidSkill("Underwater Basket Weaving")).toBe(false);
  });

  it("filters to canonical casing, dedupes, and drops off-list values", () => {
    const result = filterValidSkills([
      "frontend development",
      "Frontend Development",
      "made-up skill",
      "ui design",
    ]);
    expect(result).toEqual(["Frontend Development", "UI Design"]);
  });

  it("exposes a non-empty flat list", () => {
    expect(skills.length).toBeGreaterThan(20);
  });
});

describe("Malaysia locations", () => {
  it("contains states and federal territories, no foreign cities", () => {
    expect(malaysia_locations).toContain("Kuala Lumpur");
    expect(malaysia_locations).toContain("Sarawak");
    expect(malaysia_locations).not.toContain("Singapore");
    expect(malaysia_locations).not.toContain("London");
  });

  it("validates and canonicalises a location", () => {
    expect(isValidLocation("selangor")).toBe(true);
    expect(canonicalLocation("  penang ")).toBe("Penang");
    expect(canonicalLocation("Jakarta")).toBeNull();
    expect(canonicalLocation(null)).toBeNull();
  });
});
