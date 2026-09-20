#!/usr/bin/env node
/**
 * One-off bootstrap of the FIRST admin account.
 *
 * This is deliberately a script and not a feature. There is no "become an
 * admin" path in the dashboard, because a UI that can grant admin is a UI that
 * can be tricked into granting admin. Every subsequent admin is created by an
 * existing admin through a claim-guarded callable (Phase B).
 *
 * Usage — see docs/ADMIN_BOOTSTRAP.md.
 *
 *   Emulator:
 *     FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
 *     FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *     GCLOUD_PROJECT=umuranga-dev \
 *     node scripts/bootstrap-admin.mjs --email a@b.com --password '…'
 *
 *   Real project:
 *     GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
 *     GCLOUD_PROJECT=<project-id> \
 *     node scripts/bootstrap-admin.mjs --email a@b.com --password '…'
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const MIN_PASSWORD_LENGTH = 12;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    args[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const { email, password, revoke } = parseArgs(process.argv.slice(2));
if (!email) fail("--email is required.");

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) fail("Set GCLOUD_PROJECT to the Firebase project id.");

const usingEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
if (!usingEmulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  fail(
    "Not pointed at an emulator and GOOGLE_APPLICATION_CREDENTIALS is unset.\n" +
      "    Refusing to guess which project to grant admin on.",
  );
}

// The emulator ignores credentials, so applicationDefault() is safe there even
// with nothing configured.
initializeApp(usingEmulator ? { projectId } : { credential: applicationDefault(), projectId });
const auth = getAuth();

console.log(`\n  Project : ${projectId}${usingEmulator ? "  (EMULATOR)" : "  (REAL PROJECT)"}`);
console.log(`  Account : ${email}`);

let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`  Found existing account ${user.uid}`);
} catch (error) {
  if (error.code !== "auth/user-not-found") fail(`Lookup failed: ${error.message}`);
  if (!password) fail("Account does not exist. Pass --password to create it.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`--password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  user = await auth.createUser({ email, password, emailVerified: true });
  console.log(`  Created account ${user.uid}`);
}

const grant = revoke !== "true";
await auth.setCustomUserClaims(user.uid, grant ? { admin: true } : {});
// Existing ID tokens keep their old claims for up to an hour. Revoking forces
// the next request to mint a fresh one — without this, removing admin leaves
// the person with a working dashboard until their token happens to expire.
await auth.revokeRefreshTokens(user.uid);

const after = await auth.getUser(user.uid);
console.log(`  Claims  : ${JSON.stringify(after.customClaims ?? {})}`);
console.log(`\n  ✓ ${grant ? "Granted" : "Revoked"} admin. Sign out and back in to pick it up.\n`);
