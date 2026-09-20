import { getServices } from "@/lib/firebase";

/**
 * A development shortcut for signing in as the seeded emulator admin.
 *
 * This is NOT an authentication bypass, and the distinction is the whole
 * point. The mobile app's SCOPE.md §6 lists "View as established user" among
 * the demo affordances that "must not ship", because it signed in as another
 * account without credentials. That is the mistake being avoided here.
 *
 * What this does instead: calls `signInWithEmailAndPassword` with the
 * credentials of an account the seed script created in the *emulator*. The
 * password is checked, a real ID token is minted, and `RequireAdmin` verifies
 * the `admin` claim exactly as it would for anyone else. Delete the claim and
 * the button stops working. Nothing about the gate is weakened; only the typing
 * is skipped.
 *
 * It is reachable only when BOTH hold:
 *
 *   1. `import.meta.env.DEV` — Vite replaces this with the literal `false` in a
 *      production build, so the branch and these constants are eliminated by
 *      dead-code elimination. This is the analogue of the mobile app's
 *      compile-time `kDemoTools` const, not a runtime toggle.
 *   2. The app is pointed at the emulator suite. Against a real project these
 *      credentials belong to no one, so the button would fail anyway — but it
 *      is hidden rather than left to fail, so it can never be mistaken for a
 *      working production control.
 *
 * `npm run build && grep dist/assets/*.js` for this password is part of the
 * test suite (`src/features/auth/devAdmin.test.ts`) — the elimination is
 * asserted, not assumed.
 */
export const DEV_ADMIN_EMAIL = "dev-admin@example.invalid";
export const DEV_ADMIN_PASSWORD = "dev-admin-password-1234";

export function devAdminAvailable(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return getServices().usingEmulators;
  } catch {
    // Firebase not initialised — nothing to sign in to.
    return false;
  }
}
