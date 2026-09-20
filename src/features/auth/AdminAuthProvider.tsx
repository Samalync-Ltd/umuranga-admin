import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, type Auth } from "firebase/auth";
import { AdminAuthContext, type AdminAuthContextValue } from "@/features/auth/adminAuthContext";
import { isAdminToken, toAdminSession, type AdminAuthState } from "@/features/auth/adminClaim";

/**
 * How often the ID token is force-refreshed while an admin session is open.
 *
 * Custom claims live inside the ID token, which Firebase caches for an hour.
 * Without this, revoking someone's admin claim would leave them with a working
 * dashboard for up to 60 minutes. Ten minutes is the window we accept.
 */
const REVERIFY_INTERVAL_MS = 10 * 60 * 1000;

export function AdminAuthProvider({ auth, children }: { auth: Auth; children: ReactNode }) {
  const [state, setState] = useState<AdminAuthState>({ status: "initialising" });
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let cancelled = false;

    const evaluate = async (forceRefresh: boolean): Promise<void> => {
      const user = auth.currentUser;
      if (!user) {
        if (!cancelled) setState({ status: "signedOut" });
        return;
      }
      try {
        const token = await user.getIdTokenResult(forceRefresh);
        if (cancelled) return;
        setState(
          isAdminToken(token)
            ? { status: "admin", session: toAdminSession(user, token) }
            : { status: "notAdmin", email: user.email },
        );
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not verify admin access.",
        });
      }
    };

    refreshRef.current = () => evaluate(true);

    // onIdTokenChanged (not onAuthStateChanged) so a token refresh that drops
    // the admin claim tears the session down on its own.
    const unsubscribe = onIdTokenChanged(auth, () => void evaluate(false));
    const interval = setInterval(() => void evaluate(true), REVERIFY_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe();
    };
  }, [auth]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // The onIdTokenChanged listener performs the claim check; a successful
      // password is explicitly not a successful sign-in here.
    },
    [auth],
  );

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      state,
      signIn: handleSignIn,
      signOut: handleSignOut,
      refresh: () => refreshRef.current(),
    }),
    [state, handleSignIn, handleSignOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
