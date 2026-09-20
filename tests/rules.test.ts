/**
 * Firestore rules tests, run against the real Firestore Emulator.
 *
 * These exist because the client-side <RequireAdmin> gate is not what protects
 * the data. If these pass and the gate were deleted entirely, a non-admin
 * would still read nothing. That is the property being asserted.
 *
 * Requires the emulator: `npm run emulators` in another terminal, or
 * `firebase emulators:exec --project umuranga-dev 'npm run test:rules'`.
 */
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const ADMIN = { admin: true };
const NOT_ADMIN = {};
/** The near-miss that a loose rule would let through. */
const STRING_CLAIM = { admin: "true" };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "umuranga-rules-test",
    firestore: {
      rules: readFileSync("emulator/firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8085,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users/alice"), {
      profileComplete: true,
      locale: "en",
      isDeactivated: false,
      moderationStatus: "banned",
    });
    // Hidden by moderation — exactly the profile an admin must still be able
    // to read, and an ordinary user must not.
    await setDoc(doc(db, "profiles/alice"), {
      firstName: "Alice",
      visibility: "visible",
      moderationVisibility: "hidden",
    });
    await setDoc(doc(db, "reports/r1"), {
      reporterId: "bob",
      targetId: "alice",
      reason: "spam",
      status: "open",
    });
    await setDoc(doc(db, "entitlements/alice"), { active: true });
    await setDoc(doc(db, "payments/p1"), { uid: "alice", status: "paid" });
    await setDoc(doc(db, "adminAudit/a1"), { adminUid: "root", action: "banUser" });
    await setDoc(doc(db, "matches/alice_bob"), {
      uids: ["alice", "bob"],
      status: "active",
    });
    await setDoc(doc(db, "matches/alice_bob/messages/m1"), {
      senderId: "alice",
      type: "text",
      text: "hi",
      status: "sent",
    });
    await setDoc(doc(db, "swipes/alice/receivedFrom/bob"), { decision: "like" });
  });
});

const asAdmin = () => env.authenticatedContext("root", ADMIN).firestore();
const asUser = (uid: string, claims = NOT_ADMIN) =>
  env.authenticatedContext(uid, claims).firestore();
const asAnon = () => env.unauthenticatedContext().firestore();

describe("admin read access", () => {
  const readable = [
    ["users/alice", "users"],
    ["profiles/alice", "profiles (moderation-hidden)"],
    ["reports/r1", "reports"],
    ["entitlements/alice", "entitlements"],
    ["payments/p1", "payments"],
    ["adminAudit/a1", "adminAudit"],
    ["matches/alice_bob", "matches"],
    ["matches/alice_bob/messages/m1", "chat messages"],
  ] as const;

  it.each(readable)("an admin can read %s", async (path) => {
    await assertSucceeds(getDoc(doc(asAdmin(), path)));
  });

  it.each(readable)("a non-admin signed-in user cannot read %s", async (path) => {
    await assertFails(getDoc(doc(asUser("mallory"), path)));
  });

  it.each(readable)("an anonymous caller cannot read %s", async (path) => {
    await assertFails(getDoc(doc(asAnon(), path)));
  });

  it("a claim of the string 'true' does not grant admin read", async () => {
    await assertFails(getDoc(doc(asUser("mallory", STRING_CLAIM), "reports/r1")));
  });

  it("an admin can list the report queue", async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), "reports")));
  });
});

describe("admin write access — must be denied everywhere", () => {
  it("an admin cannot resolve a report by direct write", async () => {
    await assertFails(setDoc(doc(asAdmin(), "reports/r1"), { status: "resolved" }));
  });

  it("an admin cannot suspend a user by direct write", async () => {
    await assertFails(setDoc(doc(asAdmin(), "users/alice"), { moderationStatus: "suspended" }));
  });

  it("an admin cannot grant an entitlement by direct write", async () => {
    await assertFails(setDoc(doc(asAdmin(), "entitlements/alice"), { active: true }));
  });

  it("an admin cannot write a payment record", async () => {
    await assertFails(setDoc(doc(asAdmin(), "payments/p2"), { uid: "alice" }));
  });

  it("an admin cannot forge an audit entry", async () => {
    await assertFails(setDoc(doc(asAdmin(), "adminAudit/a2"), { action: "banUser" }));
  });

  it("an admin cannot hide a profile by direct write", async () => {
    await assertFails(
      setDoc(doc(asAdmin(), "profiles/alice"), { moderationVisibility: "hidden" }),
    );
  });
});

describe("the owner still cannot escalate", () => {
  it("a user cannot lift their own suspension", async () => {
    await assertFails(
      setDoc(doc(asUser("alice"), "users/alice"), { moderationStatus: "active" }, { merge: true }),
    );
  });

  it("a user cannot read another user's private settings", async () => {
    await assertFails(getDoc(doc(asUser("mallory"), "users/alice/private/settings")));
  });

  it("an admin cannot read private settings either — that path is callable-only (A6)", async () => {
    await assertFails(getDoc(doc(asAdmin(), "users/alice/private/settings")));
  });
});

describe("FIX: G1 — chat rules exist at all", () => {
  it("a participant can read messages in their own match", async () => {
    await assertSucceeds(getDoc(doc(asUser("bob"), "matches/alice_bob/messages/m1")));
  });

  it("a stranger cannot read messages in someone else's match", async () => {
    await assertFails(getDoc(doc(asUser("mallory"), "matches/alice_bob/messages/m1")));
  });

  it("a participant cannot forge a message from the other person", async () => {
    await assertFails(
      setDoc(doc(asUser("bob"), "matches/alice_bob/messages/m2"), {
        senderId: "alice",
        type: "text",
        text: "forged",
      }),
    );
  });
});

describe("FIX: G6 — dismissReceivedLike can delete its own inbox entry", () => {
  it("the owner may delete a receivedFrom entry", async () => {
    await assertSucceeds(deleteDoc(doc(asUser("alice"), "swipes/alice/receivedFrom/bob")));
  });

  it("nobody else may", async () => {
    await assertFails(deleteDoc(doc(asUser("mallory"), "swipes/alice/receivedFrom/bob")));
  });
});
