import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Auth, IdTokenResult, User } from "firebase/auth";

const listeners: Array<() => void> = [];

vi.mock("firebase/auth", () => ({
  onIdTokenChanged: (_auth: Auth, cb: () => void) => {
    listeners.push(cb);
    cb();
    return () => {};
  },
  signOut: vi.fn(async () => {}),
  signInWithEmailAndPassword: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn() },
  reauthenticateWithCredential: vi.fn(),
  updatePassword: vi.fn(),
}));

const { AdminAuthProvider } = await import("@/features/auth/AdminAuthProvider");
const { RequireAdmin } = await import("@/features/auth/RequireAdmin");

function authWith(user: Partial<User> | null): Auth {
  return { currentUser: user } as Auth;
}

function userWithClaims(claims: Record<string, unknown>): Partial<User> {
  return {
    uid: "uid-1",
    email: "admin@example.invalid",
    displayName: null,
    getIdTokenResult: async () =>
      ({ claims, expirationTime: new Date(Date.now() + 3_600_000).toISOString() }) as IdTokenResult,
  };
}

const renderGate = (auth: Auth) =>
  render(
    <AdminAuthProvider auth={auth}>
      <RequireAdmin>
        <div>DASHBOARD CONTENT</div>
      </RequireAdmin>
    </AdminAuthProvider>,
  );

afterEach(() => {
  listeners.length = 0;
  vi.clearAllMocks();
});

describe("RequireAdmin", () => {
  it("renders the sign-in form, not the dashboard, when signed out", async () => {
    renderGate(authWith(null));
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText("DASHBOARD CONTENT")).not.toBeInTheDocument();
  });

  it("renders the dashboard only when the admin claim is exactly true", async () => {
    renderGate(authWith(userWithClaims({ admin: true })));
    expect(await screen.findByText("DASHBOARD CONTENT")).toBeInTheDocument();
  });

  it("denies a signed-in user with no admin claim", async () => {
    renderGate(authWith(userWithClaims({})));
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText("DASHBOARD CONTENT")).not.toBeInTheDocument();
  });

  it("denies a signed-in user whose claim is the string 'true'", async () => {
    renderGate(authWith(userWithClaims({ admin: "true" })));
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText("DASHBOARD CONTENT")).not.toBeInTheDocument();
  });

  it("shows an error state, and never the dashboard, when the token cannot be read", async () => {
    const broken: Partial<User> = {
      uid: "uid-1",
      email: "admin@example.invalid",
      displayName: null,
      getIdTokenResult: async () => {
        throw new Error("network down");
      },
    };
    renderGate(authWith(broken));
    expect(await screen.findByText(/could not verify access/i)).toBeInTheDocument();
    expect(screen.queryByText("DASHBOARD CONTENT")).not.toBeInTheDocument();
  });
});
