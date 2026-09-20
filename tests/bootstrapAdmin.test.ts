/**
 * End-to-end check of the one path Phase A exists to establish:
 *
 *   bootstrap script → custom claim on a real Auth account →
 *   client SDK sign-in → ID token carrying admin:true →
 *   that token actually reading an admin-only collection.
 *
 * This uses the real Auth and Firestore emulators and the real client SDK.
 * Nothing here is mocked. The negative case — an ordinary account created the
 * same way, without the claim — is asserted alongside it, because "the admin
 * can read" only means something if "everyone else cannot" is checked too.
 *
 * Requires: firebase emulators:exec --only auth,firestore
 */
import { execFileSync } from "node:child_process";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isAdminToken } from "../src/features/auth/adminClaim";

const PROJECT_ID = "umuranga-dev";
const AUTH_EMU = "127.0.0.1:9099";
const FS_EMU = "127.0.0.1:8085";

const ADMIN_EMAIL = "e2e-admin@example.invalid";
const PLAIN_EMAIL = "e2e-plain@example.invalid";
const PASSWORD = "e2e-password-1234";

let app: FirebaseApp;

const emulatorEnv = {
  ...process.env,
  GCLOUD_PROJECT: PROJECT_ID,
  FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMU,
  FIRESTORE_EMULATOR_HOST: FS_EMU,
};

function runBootstrap(args: string[]): string {
  return execFileSync("node", ["scripts/bootstrap-admin.mjs", ...args], {
    env: emulatorEnv,
    encoding: "utf8",
  });
}

beforeAll(async () => {
  // The admin account, granted the claim by the documented bootstrap script.
  runBootstrap(["--email", ADMIN_EMAIL, "--password", PASSWORD]);
  // A second account created the same way but never granted the claim.
  runBootstrap(["--email", PLAIN_EMAIL, "--password", PASSWORD, "--revoke", "true"]);

  app = initializeApp({ apiKey: "emulator", projectId: PROJECT_ID }, "e2e");
  connectAuthEmulator(getAuth(app), `http://${AUTH_EMU}`, { disableWarnings: true });
  connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8085);

  // Seed one report to read. Written with rules disabled is not an option from
  // the client SDK, so this relies on the client create rule: a signed-in user
  // may create a report where reporterId is their own uid.
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, PLAIN_EMAIL, PASSWORD);
  const { setDoc } = await import("firebase/firestore");
  await setDoc(doc(getFirestore(app), "reports/e2e-report"), {
    reporterId: auth.currentUser!.uid,
    targetId: "someone",
    reason: "spam",
    description: null,
    createdAt: new Date(),
  });
  await signOut(auth);
});

afterAll(async () => {
  if (app) await deleteApp(app);
});

describe("bootstrap-admin.mjs → dashboard access", () => {
  it("grants an admin claim that the client SDK sees as boolean true", async () => {
    const auth = getAuth(app);
    const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, PASSWORD);
    const token = await credential.user.getIdTokenResult(true);

    expect(token.claims.admin).toBe(true);
    // The same predicate the dashboard gate uses, against a real token.
    expect(isAdminToken(token)).toBe(true);
    await signOut(auth);
  });

  it("lets that token read reports, which no client is allowed to read", async () => {
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, PASSWORD);
    const snapshot = await getDoc(doc(getFirestore(app), "reports/e2e-report"));
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()?.reason).toBe("spam");
    await signOut(auth);
  });

  it("leaves an ordinary account without the claim", async () => {
    const auth = getAuth(app);
    const credential = await signInWithEmailAndPassword(auth, PLAIN_EMAIL, PASSWORD);
    const token = await credential.user.getIdTokenResult(true);

    expect(token.claims.admin).toBeUndefined();
    expect(isAdminToken(token)).toBe(false);
    await signOut(auth);
  });

  it("denies that ordinary account the report it wrote itself", async () => {
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, PLAIN_EMAIL, PASSWORD);
    // Reports are write-only from the client — even the reporter cannot read
    // back what they filed. Asserted on the error *code*, not the message: the
    // emulator returns a verbose rules-evaluation trace rather than the plain
    // "permission denied" a real project sends.
    const denied = await getDoc(doc(getFirestore(app), "reports/e2e-report")).then(
      () => null,
      (error: unknown) => error as { code?: string },
    );
    expect(denied).not.toBeNull();
    expect(denied?.code).toBe("permission-denied");
    await signOut(auth);
  });

  it("--revoke true removes the claim from an existing admin", async () => {
    runBootstrap(["--email", ADMIN_EMAIL, "--revoke", "true"]);
    const auth = getAuth(app);
    const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, PASSWORD);
    const token = await credential.user.getIdTokenResult(true);

    expect(isAdminToken(token)).toBe(false);
    await signOut(auth);

    // Put it back so the suite is order-independent.
    runBootstrap(["--email", ADMIN_EMAIL]);
  });
});
