import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui/Button";
import { CenteredPanel } from "@/components/ui/CenteredPanel";
import { StatusChip } from "@/components/ui/StatusChip";
import { Field } from "@/components/ui/Field";
import { useAdminAuth } from "@/features/auth/useAdminAuth";
import { DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD, devAdminAvailable } from "@/features/auth/devAdmin";

/**
 * Sign-in error copy.
 *
 * Every credential failure collapses to one message on purpose: telling an
 * attacker that an email exists but the password is wrong enumerates admin
 * accounts. `invalid-credential` is what modern Firebase returns for both, but
 * older codes still surface, so they are folded in here too.
 */
function messageFor(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "Could not sign in. Check your connection and try again.";
  }
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return "Incorrect email or password.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Could not reach Firebase. Check your connection.";
    default:
      return `Could not sign in (${error.code}).`;
  }
}

export function LoginPage() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (withEmail: string, withPassword: string) => {
    setError(null);
    setBusy(true);
    try {
      await signIn(withEmail, withPassword);
      // Deliberately no navigation here. Passing the password check is not the
      // same as being an admin; the provider decides what renders next once it
      // has verified the claim.
    } catch (caught) {
      setError(messageFor(caught));
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(email, password);
  };

  return (
    <CenteredPanel>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="rounded-md bg-brand-red-subtle px-3 py-2 text-meta text-status-urgent">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" disabled={busy} className="mt-1 w-full py-2">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-caption text-fg-subtle">
          Admin accounts are provisioned directly. There is no sign-up, and no password reset from
          this screen — contact another administrator.
        </p>
      </form>

      {/* `import.meta.env.DEV` is written inline, not hidden behind
          devAdminAvailable(), and that is load-bearing. Vite replaces it with
          the literal `false` in a production build, which lets the bundler
          collapse this to `null`, drop <DevAdminShortcut>, and then drop the
          credentials it referenced. Behind a function call the bundler cannot
          see any of that, and the password ships. devAdmin.test.ts caught
          exactly this. */}
      {import.meta.env.DEV && devAdminAvailable() ? (
        <DevAdminShortcut busy={busy} onUse={submit} />
      ) : null}
    </CenteredPanel>
  );
}

/**
 * Rendered only under `devAdminAvailable()`. See devAdmin.ts for why this is a
 * real sign-in rather than a session fake, and how it is kept out of
 * production builds.
 */
function DevAdminShortcut({
  busy,
  onUse,
}: {
  busy: boolean;
  onUse: (email: string, password: string) => Promise<void>;
}) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="mb-2 flex items-center gap-2">
        <StatusChip tone="warn">Emulator</StatusChip>
        <span className="text-caption text-fg-subtle">Development only</span>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        className="w-full py-2"
        onClick={() => void onUse(DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD)}
      >
        Sign in as seeded admin
      </Button>
      <p className="mt-2 text-caption text-fg-subtle">
        Signs in as <code>{DEV_ADMIN_EMAIL}</code> with a real password against the emulator. The
        admin claim is still verified. Run <code>npm run seed</code> first.
      </p>
    </div>
  );
}
