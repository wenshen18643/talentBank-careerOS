import { describe, expect, it } from "vitest";
import { extractFirstJsonObject } from "@/lib/json-extract";

describe("extractFirstJsonObject", () => {
  it("returns the object from clean JSON", () => {
    expect(extractFirstJsonObject('{"a":1}')).toBe('{"a":1}');
  });

  it("strips a leading code fence and surrounding prose", () => {
    const wrapped = 'Sure! Here it is:\n```json\n{"bullet":"Did a thing"}\n```\nDone.';
    expect(extractFirstJsonObject(wrapped)).toBe('{"bullet":"Did a thing"}');
  });

  it("ignores braces inside string literals", () => {
    const tricky = '{"note":"a } b { c","ok":true}';
    expect(extractFirstJsonObject(tricky)).toBe(tricky);
  });

  it("handles escaped quotes inside strings without ending early", () => {
    const escaped = '{"q":"she said \\"hi\\" }"}';
    expect(extractFirstJsonObject(escaped)).toBe(escaped);
  });

  it("returns the first balanced object when nested objects are present", () => {
    const nested = '{"outer":{"inner":1}} trailing';
    expect(extractFirstJsonObject(nested)).toBe('{"outer":{"inner":1}}');
  });

  it("returns null when there is no opening brace", () => {
    expect(extractFirstJsonObject("no json here")).toBeNull();
  });

  it("returns null when the object is never closed", () => {
    expect(extractFirstJsonObject('{"a":1')).toBeNull();
  });
});
