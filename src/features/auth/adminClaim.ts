import type { IdTokenResult, User } from "firebase/auth";

/**
 * The custom claim that grants dashboard access.
 *
 * Admin identity is separate from end-user accounts: there is no sign-up flow
 * and no self-service path to this claim. It is set only by the Admin SDK —
 * once by `scripts/bootstrap-admin.mjs` for the first account, and thereafter
 * by an admin-guarded callable. See docs/ADMIN_BOOTSTRAP.md.
 */
export const ADMIN_CLAIM = "admin" as const;

export type AdminSession = {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  /** When the current ID token expires. Drives the re-verification interval. */
  readonly expiresAt: number;
};

export type AdminAuthState =
  | { readonly status: "initialising" }
  | { readonly status: "signedOut" }
  /** Authenticated against Firebase Auth, but without the admin claim. */
  | { readonly status: "notAdmin"; readonly email: string | null }
  | { readonly status: "admin"; readonly session: AdminSession }
  | { readonly status: "error"; readonly message: string };

/**
 * Decides admin-ness from a token result. Kept pure and separate from the
 * provider so the rule that actually gates the whole app can be unit-tested
 * without a Firebase instance.
 *
 * The claim must be the boolean `true`. A truthy string, `1`, or an object
 * does not count — a loose check here is how a claim set by a buggy script
 * becomes an access-control bypass.
 */
export function isAdminToken(token: Pick<IdTokenResult, "claims">): boolean {
  return token.claims[ADMIN_CLAIM] === true;
}

export function toAdminSession(user: User, token: IdTokenResult): AdminSession {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    expiresAt: Date.parse(token.expirationTime),
  };
}
