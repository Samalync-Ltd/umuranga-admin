import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { CenteredPanel } from "@/components/ui/CenteredPanel";
import { useAdminAuth } from "@/features/auth/useAdminAuth";
import { LoginPage } from "@/features/auth/LoginPage";

/**
 * The single gate for the entire dashboard.
 *
 * Nothing below this component renders — not the shell, not the nav, not a
 * page skeleton — until an ID token has been fetched and its `admin` claim
 * verified. There is no "render the layout while we check" path, because a
 * visible admin shell is itself information.
 *
 * This is a *client-side* gate over a *server-side* fact. It exists to keep
 * non-admins out of the UI; it is not what protects the data. That is
 * `firestore.rules` (admin-branch reads) plus Cloud Functions with verified
 * claims (every privileged write). See FIRESTORE_SCHEMA.md, Parts 2 and 3.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { state, signOut } = useAdminAuth();

  switch (state.status) {
    case "initialising":
      return (
        <CenteredPanel>
          <p className="text-body text-fg-muted">Verifying admin access…</p>
        </CenteredPanel>
      );

    case "signedOut":
      return <LoginPage />;

    case "notAdmin":
      return (
        <CenteredPanel>
          <h1 className="mb-2 text-section font-semibold text-fg">Access denied</h1>
          <p className="mb-1 text-body text-fg-muted">
            {state.email ?? "This account"} is signed in but is not an administrator.
          </p>
          <p className="mb-5 text-caption text-fg-subtle">
            Admin access is granted by custom claim, not by having an Umuranga account. If this is
            wrong, ask an existing administrator to grant the claim, then sign in again.
          </p>
          <Button variant="secondary" className="w-full py-2" onClick={() => void signOut()}>
            Sign out
          </Button>
        </CenteredPanel>
      );

    case "error":
      return (
        <CenteredPanel>
          <h1 className="mb-2 text-section font-semibold text-fg">Could not verify access</h1>
          <p className="mb-5 text-body text-fg-muted">{state.message}</p>
          <Button variant="secondary" className="w-full py-2" onClick={() => void signOut()}>
            Sign out and retry
          </Button>
        </CenteredPanel>
      );

    case "admin":
      return <>{children}</>;
  }
}
