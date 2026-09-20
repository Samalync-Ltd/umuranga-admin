# Bootstrapping the first admin account

## Why this is a script and not a screen

There is no "become an admin" path in the dashboard, and there will not be one.
A UI that can grant the `admin` claim is a UI that can be tricked into granting
it — through a missing guard, a mis-scoped callable, or an XSS on the one page
in the product that has the highest privilege. The first admin is created out
of band, once, by someone holding project credentials.

Every *subsequent* admin is created by an existing admin through a
claim-guarded callable (Phase B), which writes an `adminAudit` entry. That path
is auditable. This one is not, which is precisely why it runs once.

Admin identity is also **separate from end-user accounts**. An admin account is
not created through the mobile app's sign-up flow, does not have a
`users/{uid}` document, and does not appear in Discovery. It exists only in
Firebase Auth, carrying one custom claim.

## The claim

```json
{ "admin": true }
```

The boolean `true`, not the string `"true"`. Everything that checks this claim —
`isAdminToken()` in the dashboard, `isAdmin()` in `firestore.rules`, and every
Cloud Function in Phase B onwards — compares against the boolean and rejects
near-misses. `src/features/auth/adminClaim.test.ts` asserts that, and
`tests/rules.test.ts` asserts the rules agree.

## Against the emulator

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 23)   # firebase-tools needs JDK 21+
npm run emulators                                  # in one terminal

# in another:
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GCLOUD_PROJECT=umuranga-dev \
node scripts/bootstrap-admin.mjs --email you@example.com --password 'a-long-password'
```

Then `cp .env.emulator.example .env.local && npm run dev` and sign in at
<http://localhost:5273>.

## Against the real Firebase project

1. In the Firebase console: **Project settings → Service accounts → Generate
   new private key**. Save the JSON outside the repository. It is a
   project-wide credential; `.gitignore` blocks `*serviceAccount*.json` and
   `*-adminsdk-*.json`, but the safe place for it is not the repo at all.

2. Run:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/secure/path/serviceAccount.json \
   GCLOUD_PROJECT=<the-real-project-id> \
   node scripts/bootstrap-admin.mjs --email admin@example.com --password 'a-long-password'
   ```

3. Delete the key from the machine that ran it, or rotate it, once the first
   admin exists. It is not needed again — Cloud Functions get their credentials
   from the runtime.

The script refuses to run against a non-emulator target without
`GOOGLE_APPLICATION_CREDENTIALS` set, rather than picking up whatever ambient
credential happens to be around and granting admin on the wrong project.

## Revoking

```bash
node scripts/bootstrap-admin.mjs --email someone@example.com --revoke true
```

This clears the claim **and** revokes refresh tokens. The revocation matters:
custom claims are baked into the ID token, which Firebase caches for an hour.
Clearing the claim without revoking leaves the person with a working dashboard
until their token happens to expire. The dashboard also force-refreshes its own
token every 10 minutes (`REVERIFY_INTERVAL_MS`), which closes the same gap from
the other side.

## Operational notes

- **Use a real password manager entry.** This account can ban users.
- **One account per person.** Shared admin logins make `adminAudit` useless —
  the log records who did what, and that only means something if "who" is a
  person.
- **Enable MFA on the Google account** that holds the service-account key.
- The dashboard's own sign-in screen has no password-reset link on purpose.
  Self-service reset over email is a plausible path into an account that can
  ban people; recovery goes through another administrator.
