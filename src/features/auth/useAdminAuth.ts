import { useContext } from "react";
import { AdminAuthContext, type AdminAuthContextValue } from "@/features/auth/adminAuthContext";
import type { AdminSession } from "@/features/auth/adminClaim";

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  return context;
}

/**
 * Narrowed accessor for surfaces that only ever render inside <RequireAdmin>.
 *
 * Throwing rather than returning null is the point: if this ever fires, a
 * component that assumes a verified admin session has been mounted outside the
 * gate, and that is a bug worth crashing on rather than rendering around.
 */
export function useAdminSession(): AdminSession {
  const { state } = useAdminAuth();
  if (state.status !== "admin") {
    throw new Error("useAdminSession used outside a verified admin session");
  }
  return state.session;
}
