import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { StatusChip } from "@/components/ui/StatusChip";
import { useAdminAuth, useAdminSession } from "@/features/auth/useAdminAuth";
import { getServices } from "@/lib/firebase";

const MIN_PASSWORD_LENGTH = 12;

function messageFor(error: unknown): string {
  if (!(error instanceof FirebaseError)) return "Could not change the password.";
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Current password is incorrect.";
    case "auth/weak-password":
      return "Firebase rejected that password as too weak.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Could not reach Firebase. Check your connection.";
    default:
      return `Could not change the password (${error.code}).`;
  }
}

/** AD07 — admin account settings. Password change and sign-out. */
export function AccountPage() {
  const session = useAdminSession();
  const { signOut } = useAdminAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(false);

    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("The two new passwords don't match.");
      return;
    }

    const { auth } = getServices();
    const user = auth.currentUser;
    if (!user?.email) {
      setError("This session has no email address and cannot change its own password.");
      return;
    }

    setBusy(true);
    try {
      // Firebase requires a recent sign-in for updatePassword. Re-authenticating
      // here also means a walked-away-from session can't have its password
      // changed by whoever sits down next.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-3xl">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-page font-bold tracking-tight text-fg">Admin account</h1>
        <StatusChip tone="neutral">AD07</StatusChip>
      </div>
      <p className="mb-5 text-body text-fg-muted">
        This account&rsquo;s dashboard access comes from an <code>admin</code> custom claim, which
        cannot be changed from here.
      </p>

      <dl className="mb-6 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 rounded-lg border border-border bg-surface p-5 text-body">
        <dt className="text-fg-muted">Email</dt>
        <dd className="text-fg">{session.email ?? "—"}</dd>
        <dt className="text-fg-muted">User ID</dt>
        <dd className="font-mono text-meta text-fg">{session.uid}</dd>
        <dt className="text-fg-muted">Session token expires</dt>
        <dd className="text-fg">{new Date(session.expiresAt).toLocaleString()}</dd>
      </dl>

      <form onSubmit={onSubmit} noValidate className="max-w-sm rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-4 text-section font-semibold text-fg">Change password</h2>
        <div className="flex flex-col gap-4">
          <Field
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Field
            label={`New password (${MIN_PASSWORD_LENGTH}+ characters)`}
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <Field
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error ? (
            <p role="alert" className="rounded-md bg-brand-red-subtle px-3 py-2 text-meta text-status-urgent">
              {error}
            </p>
          ) : null}
          {done ? (
            <p role="status" className="rounded-md bg-status-ok-bg px-3 py-2 text-meta text-status-ok">
              Password changed.
            </p>
          ) : null}
          <Button type="submit" variant="primary" disabled={busy} className="w-full py-2">
            {busy ? "Changing…" : "Change password"}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <Button variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </section>
  );
}
