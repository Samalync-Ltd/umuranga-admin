# Umuranga Admin

The web admin dashboard from Agreement §2.4. A separate application from
`umuranga-mobile`, sharing one Firebase project and the brand identity.

**Status: Phase A (foundation) complete, awaiting review. Phases B–F not started.**

---

## The rule this codebase is built around

The mobile app's architecture rests on one rule: **the client is never trusted
for privileged state.** The dashboard follows the identical rule.

- **Reads** go through the Firebase JS SDK, gated by an `admin` custom claim in
  `firestore.rules`.
- **Every privileged write** — suspend, ban, resolve a report, override an
  entitlement — goes through a Cloud Function callable that verifies the claim
  server-side.
- **The dashboard client never writes to Firestore.** Not once, not as a
  shortcut. `tests/rules.test.ts` asserts this by trying every admin write and
  requiring each to fail.

The client-side `<RequireAdmin>` gate keeps non-admins out of the *UI*. It is
not what protects the *data*. If the gate were deleted entirely, a non-admin
would still read nothing.

## Quick start (emulator)

```bash
npm install --legacy-peer-deps          # see "Known environment issues"
cp .env.emulator.example .env.local
export JAVA_HOME=$(/usr/libexec/java_home -v 23)

npm run emulators                       # terminal 1
npm run bootstrap-admin -- --email you@example.com --password 'a-long-password'
npm run seed
npm run dev                             # http://localhost:5273
```

Then click **"Sign in as seeded admin"** on the login screen.

### About that button

It is not an authentication bypass. It calls `signInWithEmailAndPassword` with
the credentials of an account `npm run seed` created in the **emulator** — the
password is checked, a real ID token is minted, and `<RequireAdmin>` verifies
the `admin` claim exactly as it would for anyone else. Remove the claim and the
button stops working.

The mobile app's SCOPE.md §6 lists "View as established user" among the demo
controls that must never ship, because that one really did sign in as another
account without credentials. This is deliberately not that.

It is reachable only when `import.meta.env.DEV` **and** the app is pointed at the
emulator. Vite replaces `DEV` with the literal `false` in a production build, so
the branch and its credentials are eliminated — the analogue of the mobile app's
compile-time `kDemoTools` const. `src/features/auth/devAdmin.test.ts` runs a real
production build and greps the output to prove it, because that elimination is
not something to take on trust: **the first version of this feature did leak the
password into the bundle**, and the test is what caught it.

Bootstrap and seed need emulator host variables set — see
[`docs/ADMIN_BOOTSTRAP.md`](docs/ADMIN_BOOTSTRAP.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5273 |
| `npm run build` | Type-check and production build |
| `npm run lint` | oxlint |
| `npm test` | Unit and component tests (jsdom) |
| `npm run test:rules:ci` | **Rules and end-to-end tests against the real emulator** |
| `npm run emulators` | Auth :9099, Firestore :8085, Functions :5001, UI :4000 |
| `npm run seed` | Synthetic emulator data |
| `npm run bootstrap-admin` | Grant or revoke the `admin` claim |

Firestore runs on **8085**, not the default 8080, because 8080 was occupied on
the development machine.

## Layout

```
FIRESTORE_SCHEMA.md      The authoritative schema. Read this first.
docs/ADMIN_BOOTSTRAP.md  How the first admin account is created.
emulator/                Rules used for LOCAL DEVELOPMENT ONLY — never deployed.
scripts/                 bootstrap-admin.mjs, seed-emulator.mjs
src/
  lib/                   env validation, Firebase init
  features/auth/         the admin claim gate
  components/            ui primitives, layout shell
  routes/                routing skeleton, one page per AD01–AD07
tests/                   emulator-backed rules and end-to-end tests
```

## Rules ownership — important

`umuranga-mobile` owns the deployed `firestore.rules` and `storage.rules`.
**Two repositories deploying rules to one project silently clobber each other.**
The files in `emulator/` exist for local development and are never deployed
from here; their admin additions get merged into the mobile repo in Phase F.
See [`emulator/README.md`](emulator/README.md).

## Design direction

Blueprint §11: white/light-gray workspace, black sidebar, red (`#E53935`) for
primary actions and urgent moderation state only — no large red surfaces.
Desktop-first and dense; the shell has a `min-w-[1024px]` floor and does not
reflow. Responsive work is Phase F, deliberately after the tool is usable at the
widths it will actually be used at.

Tokens are in `src/index.css`. The colour palette is the mobile app's verbatim;
the type scale is shifted down one step, because §12's 16px body is a mobile
scale and this is a data-table application.

## Known environment issues

- **`npm install` needs `--legacy-peer-deps`.** npm 10.9.2's dependency
  resolver crashes (`Cannot read properties of null (reading 'edgesOut')`) on
  vitest 4's optional peer set. Not a project problem; an npm bug.
- **Node v23.11.0 is not an LTS release** and some transitive dependencies warn
  about it. Everything builds and tests green, but Node 22 or 24 is the right
  target before this is deployed anywhere.
- **firebase-tools requires JDK 21+.** The machine defaults to JDK 17; JDK 23 is
  installed, so `export JAVA_HOME=$(/usr/libexec/java_home -v 23)` is needed
  before any emulator command.
