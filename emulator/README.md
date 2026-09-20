# `emulator/` — rules used for local development only

**These files are not deployed.** They exist so the dashboard can be developed
and tested against the Firebase Emulator while the real project is unreachable
and while the admin rule changes are still unmerged.

## Why they are not in `firebase.json` as production rules

`umuranga-mobile` already owns `firestore.rules` and `storage.rules` for this
Firebase project. **Two repositories deploying rules to one project silently
clobber each other** — whichever ran `firebase deploy --only firestore:rules`
last wins, and the loser's changes vanish with no error. That is a real risk
here, not a hypothetical: the mobile repo has a `firebase.json` pointing at its
own rules files.

**Rule: `umuranga-mobile` remains the single source of truth for deployed
rules.** The admin additions in these files get merged *into that repo* in
Phase F, reviewed there, and deployed from there. Nothing in `umuranga-admin`
is ever deployed with `--only firestore:rules` or `--only storage:rules`.

## What differs from the mobile repo's rules

Each change is marked `ADMIN:` or `FIX:` inline.

- **`ADMIN:`** an `isAdmin()` branch on the *read* clause of `users`,
  `profiles`, `reports`, `entitlements` and `matches`. Never on a write clause —
  privileged writes go through Cloud Functions with verified claims.
- **`FIX: G1`** rules for `matches/{matchId}/messages` and `.../meta/typing`,
  which have none in the mobile repo and are therefore denied outright.
- **`FIX: G6`** owner delete on `swipes/{uid}/receivedFrom/{fromUid}`, which
  `dismissReceivedLike()` calls and the current rule unconditionally denies.

See `FIRESTORE_SCHEMA.md` for the full reasoning on each.
