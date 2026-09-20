import { describe, expect, it } from "vitest";
import type { IdTokenResult } from "firebase/auth";
import { isAdminToken } from "@/features/auth/adminClaim";

const withClaims = (claims: Record<string, unknown>) =>
  ({ claims } as unknown as Pick<IdTokenResult, "claims">);

describe("isAdminToken", () => {
  it("accepts the boolean true", () => {
    expect(isAdminToken(withClaims({ admin: true }))).toBe(true);
  });

  it("rejects every truthy near-miss a bad provisioning script could produce", () => {
    // Each of these would grant access under a loose `!!claims.admin` check.
    for (const value of ["true", "yes", 1, {}, [], "admin"]) {
      expect(isAdminToken(withClaims({ admin: value }))).toBe(false);
    }
  });

  it("rejects an absent, false, or null claim", () => {
    expect(isAdminToken(withClaims({}))).toBe(false);
    expect(isAdminToken(withClaims({ admin: false }))).toBe(false);
    expect(isAdminToken(withClaims({ admin: null }))).toBe(false);
  });

  it("ignores an unrelated claim of a similar name", () => {
    expect(isAdminToken(withClaims({ isAdmin: true, administrator: true }))).toBe(false);
  });
});
