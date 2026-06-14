import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("produces a salted hash that is not the plaintext", () => {
    const hash = hashPassword("correct-horse-battery");
    expect(hash).not.toContain("correct-horse-battery");
    expect(hash.split(":")).toHaveLength(2);
  });

  it("verifies a correct password", () => {
    const hash = hashPassword("s3cret-passphrase");
    expect(verifyPassword("s3cret-passphrase", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("s3cret-passphrase");
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("salts: two hashes of the same password differ", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("rejects a malformed stored hash without throwing", () => {
    expect(verifyPassword("x", "garbage")).toBe(false);
  });
});
