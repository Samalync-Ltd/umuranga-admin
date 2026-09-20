import { createContext } from "react";
import type { AdminAuthState } from "@/features/auth/adminClaim";

export type AdminAuthContextValue = {
  readonly state: AdminAuthState;
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  /** Forces an immediate claim re-check. */
  readonly refresh: () => Promise<void>;
};

/**
 * Kept in its own module so `AdminAuthProvider.tsx` exports a component and
 * nothing else — otherwise Fast Refresh silently stops working for the file
 * that gates the whole app, which is a miserable thing to debug.
 */
export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
