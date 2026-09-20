#!/usr/bin/env node
/**
 * Seeds the emulator with a small, honest data set for dashboard development.
 *
 * Field shapes come from FIRESTORE_SCHEMA.md Part 1, which was read out of the
 * mobile source — not invented here. Where Part 2 adds a field that does not
 * exist in the mobile app yet (moderationStatus, report status/priority,
 * payments), the seed writes it and the schema doc marks it as an addition.
 *
 * Deliberately small and obviously synthetic. It is not a fake production data
 * set; nothing here should ever read as real user data.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    "\n  ✗ Refusing to run: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must both be set.\n" +
      "    This script writes synthetic data and must never touch a real project.\n",
  );
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT ?? "umuranga-dev";
initializeApp({ projectId });
const db = getFirestore();
const auth = getAuth();

const daysAgo = (n) => Timestamp.fromMillis(Date.now() - n * 86_400_000);

/**
 * The account behind the login screen's "Sign in as seeded admin" button.
 * Must stay in sync with src/features/auth/devAdmin.ts.
 *
 * Created here rather than in bootstrap-admin.mjs because it is emulator
 * furniture, not a real administrator: this script already refuses to run
 * against anything but an emulator, which is exactly the guarantee this
 * account needs.
 */
const DEV_ADMIN = { uid: "dev-admin", email: "dev-admin@example.invalid", password: "dev-admin-password-1234" };

await auth.deleteUser(DEV_ADMIN.uid).catch(() => {});
await auth.createUser({
  uid: DEV_ADMIN.uid,
  email: DEV_ADMIN.email,
  password: DEV_ADMIN.password,
  emailVerified: true,
});
// The same claim shape bootstrap-admin.mjs sets, and the same one
// firestore.rules and <RequireAdmin> check. Nothing special-cased.
await auth.setCustomUserClaims(DEV_ADMIN.uid, { admin: true });

const PEOPLE = [
  { uid: "seed-user-01", first: "Test-A", gender: "woman", into: "men", age: 27, city: "Kigali", mod: "active" },
  { uid: "seed-user-02", first: "Test-B", gender: "man", into: "women", age: 31, city: "Kigali", mod: "active" },
  { uid: "seed-user-03", first: "Test-C", gender: "woman", into: "men", age: 24, city: "Huye", mod: "suspended" },
  { uid: "seed-user-04", first: "Test-D", gender: "man", into: "women", age: 29, city: "Musanze", mod: "banned" },
];

for (const person of PEOPLE) {
  await auth.deleteUser(person.uid).catch(() => {});
  await auth.createUser({
    uid: person.uid,
    email: `${person.uid}@example.invalid`,
    password: "seed-password-1234",
    disabled: person.mod === "banned",
  });

  await db.doc(`users/${person.uid}`).set({
    profileComplete: true,
    locale: "en",
    isDeactivated: false,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
    // Part 2 / A1 — does not exist in the mobile app yet.
    moderationStatus: person.mod,
    suspendedUntil: person.mod === "suspended" ? Timestamp.fromMillis(Date.now() + 7 * 86_400_000) : null,
    moderationReason: person.mod === "active" ? null : "Seeded example",
    moderationUpdatedAt: person.mod === "active" ? null : daysAgo(2),
    moderationUpdatedBy: person.mod === "active" ? null : "seed-script",
  });

  await db.doc(`users/${person.uid}/private/settings`).set({
    dateOfBirth: Timestamp.fromMillis(Date.now() - person.age * 365.25 * 86_400_000),
    preferredMinAge: 21,
    preferredMaxAge: 40,
    locationPreference: "sameCountry",
    phoneNumber: `+2507000000${person.uid.slice(-2)}`,
  });

  await db.doc(`profiles/${person.uid}`).set({
    firstName: person.first,
    displayAge: person.age,
    gender: person.gender,
    interestedIn: person.into,
    relationshipIntention: "seriousRelationship",
    country: "Rwanda",
    city: person.city,
    bio: "Seeded profile for dashboard development.",
    interests: ["music", "travel"],
    languages: ["en", "rw"],
    photos: [],
    visibility: "visible",
    // Suspended and banned accounts are hidden — the exact case that proves
    // the admin read branch is doing something.
    moderationVisibility: person.mod === "active" ? "visible" : "hidden",
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
  });

  await db.doc(`entitlements/${person.uid}`).set({
    active: person.uid === "seed-user-02",
    purchasedAt: person.uid === "seed-user-02" ? daysAgo(12) : null,
  });
}

const matchId = "seed-user-01_seed-user-02";
await db.doc(`matches/${matchId}`).set({
  uids: ["seed-user-01", "seed-user-02"],
  status: "active",
  createdAt: daysAgo(5),
});
await db.collection(`matches/${matchId}/messages`).add({
  senderId: "seed-user-01",
  type: "text",
  text: "Seeded message.",
  sentAt: daysAgo(5),
  status: "read",
});

const REPORTS = [
  { reporter: "seed-user-01", target: "seed-user-04", reason: "harassmentOrAbuse", status: "open", priority: "normal" },
  { reporter: "seed-user-02", target: "seed-user-03", reason: "underage", status: "open", priority: "high" },
  { reporter: "seed-user-02", target: "seed-user-04", reason: "spam", status: "resolved", priority: "low" },
];
for (const report of REPORTS) {
  await db.collection("reports").add({
    reporterId: report.reporter,
    targetId: report.target,
    reason: report.reason,
    description: "Seeded report.",
    createdAt: daysAgo(3),
    // Part 2 / A2 — do not exist in the mobile app yet.
    status: report.status,
    priority: report.priority,
    assignedTo: null,
    resolutionNotes: report.status === "resolved" ? "Seeded resolution." : null,
    resolutionAction: report.status === "resolved" ? "none" : null,
    resolvedAt: report.status === "resolved" ? daysAgo(1) : null,
    resolvedBy: report.status === "resolved" ? "seed-script" : null,
  });
}

// Part 2 / A3. Real payment data will not exist until the mobile app's
// monetization backend lands; Phase D shows an honest empty state without it.
await db.collection("payments").add({
  uid: "seed-user-02",
  platform: "playStore",
  productId: "umuranga_premium_monthly",
  originalTransactionId: "seed-txn-0001",
  amountMinor: 500_000,
  currency: "RWF",
  status: "paid",
  purchasedAt: daysAgo(12),
  expiresAt: Timestamp.fromMillis(Date.now() + 18 * 86_400_000),
  rawNotificationId: null,
});

await db.collection("adminAudit").add({
  adminUid: "seed-script",
  adminEmail: "seed@example.invalid",
  action: "banUser",
  targetType: "user",
  targetId: "seed-user-04",
  before: { moderationStatus: "active" },
  after: { moderationStatus: "banned" },
  reason: "Seeded audit entry",
  createdAt: FieldValue.serverTimestamp(),
});

console.log(
  `\n  ✓ Seeded ${PEOPLE.length} users, 1 match, ${REPORTS.length} reports, 1 payment into ${projectId}.` +
    `\n  ✓ Dev admin: ${DEV_ADMIN.email} (admin claim set)\n`,
);
