# Umuranga — Authoritative Firestore Schema

**Status:** Task 0 deliverable. Shared reference for the admin dashboard *and* for the
mobile app's eventual backend integration.

**Derived from** (in precedence order):

1. `UMURANGA DEVELOPMENT AGREEMENT.pdf` §2.4
2. `Umuranga_Mobile_App_Blueprint.pdf` §11 (see [Conflict C1](#c1--the-blueprint-has-no-schema-and-no-section-15))
3. The admin dashboard brief
4. `umuranga-mobile` — `firestore.rules`, `storage.rules`, `firestore.indexes.json`,
   and every `*FirestoreService` / `Firebase*Repository` in `lib/features/**`

Everything in [Part 1](#part-1--collections-as-they-exist-today) was read out of the mobile
source, not inferred. Everything in [Part 2](#part-2--required-additions-for-the-admin-dashboard)
is a **proposed addition** that does not exist yet and is required before the corresponding
dashboard phase can work.

---

## Legend

| Writer | Meaning |
|---|---|
| **client** | The end-user mobile app, writing as the signed-in owner, constrained by `firestore.rules`. |
| **fn** | A Cloud Function using the Admin SDK. Bypasses rules. The only writer for privileged state. |
| **admin** | The dashboard's browser client. **Never writes.** Reads only, gated on a verified `admin` custom claim. |

`ts` = Firestore `Timestamp`. `daykey` = `YYYY-MM-DD` string, computed in **UTC**
(`_todayKey()` in `discovery_firestore_service.dart:273` and
`rewarded_ad_firestore_service.dart:23`).

---

# Part 1 — Collections as they exist today

## 1. `users/{uid}` — account record

Written by `ProfileFirestoreService.saveProfile` and `AccountFirestoreService`.

| Field | Type | Notes |
|---|---|---|
| `profileComplete` | `bool` | Drives `publicProfileIsEligible()` in rules and Discovery visibility. |
| `locale` | `string \| null` | First entry of `profile.languages`. `null` when the user picked no language. |
| `isDeactivated` | `bool` | **User-controlled self-deactivation.** Not a moderation lever — see [Gap G4](#g4--there-is-no-admin-suspensionban-field-at-all). |
| `createdAt` | `ts` | Rules pin this to `request.time` on create. |
| `updatedAt` | `ts` | Rules pin this to `request.time` on every write. |

**Read:** owner only. **Write:** owner, and only the keys above.
**Admin today: cannot read.** See [Gap G2](#g2--the-dashboard-has-no-read-path-into-anything).

## 2. `users/{uid}/private/**` — owner-private documents

Rules: `allow read, write: if owns(uid)` on the whole subtree. Four distinct documents live here.

### 2a. `users/{uid}/private/settings`

| Field | Type | Notes |
|---|---|---|
| `dateOfBirth` | `ts` | Real DOB. Deliberately **never** in `profiles/{uid}` — only the derived `displayAge` is public. |
| `preferredMinAge` | `int` | Default 18. |
| `preferredMaxAge` | `int` | Default 45. |
| `locationPreference` | `string` | `sameCity` \| `sameCountry` \| `anywhere` |
| `phoneNumber` | `string` | Commented in `user_profile.dart` as *"Internal duplicate-account/fraud-signal use only."* Same visibility tier as account email. Relevant to admin fraud review; see [Addition A6](#a6--admin-read-scope-for-private-fields). |

### 2b. `users/{uid}/private/discoveryUsage`

| Field | Type | Notes |
|---|---|---|
| `likeDate` | `daykey` | |
| `likesGivenToday` | `int` | Reset implicitly when `likeDate` ≠ today. |

### 2c. `users/{uid}/private/discoveryBonusUsage`

| Field | Type | Notes |
|---|---|---|
| `date` | `daykey` | |
| `bonus` | `int` | Extra likes granted by rewarded ads today. |

### 2d. `users/{uid}/private/discoveryFilters`

| Field | Type | Notes |
|---|---|---|
| `intentionFilter` | `string \| null` | A `RelationshipIntention` name. |
| `interestFilter` | `string[]` | `InterestId` names. |
| `boostedVisibilityEnabled` | `bool` | Premium flag; currently stored but not consumed by the Discovery query. |

### 2e. `users/{uid}/private/revealedLikers/ids/{likerUid}`

A collection nested under the `revealedLikers` document.

| Field | Type | Notes |
|---|---|---|
| `revealedAt` | `ts` | Presence of the doc *is* the reveal. |

## 3. `profiles/{uid}` — public profile

The only cross-user-readable profile surface. Written by `ProfileFirestoreService.saveProfile`,
shaped by `ProfileFirestoreMapper.publicData`.

| Field | Type | Notes |
|---|---|---|
| `firstName` | `string` | Trimmed. |
| `displayAge` | `int \| null` | **Precomputed at write time** from private `dateOfBirth`. Goes stale between profile saves — a user who does not re-save never has a birthday. Flagged as [Gap G8](#g8--displayage-is-a-precomputed-int-that-goes-stale). |
| `gender` | `string \| null` | `woman` \| `man` |
| `interestedIn` | `string \| null` | `women` \| `men`. Public so Discovery can filter mutually without private reads. |
| `relationshipIntention` | `string \| null` | `seriousRelationship` \| `marriageMinded` \| `gettingToKnowSeriously` |
| `country` | `string` | Trimmed. |
| `city` | `string` | Trimmed. |
| `bio` | `string` | Passed through `ProfileJsonMapper.normalizeBio`. |
| `interests` | `string[]` | `InterestId` names (20 values). |
| `languages` | `string[]` | |
| `photos` | `map[]` | See below. |
| `visibility` | `string` | `hidden` \| `visible`. **User-controlled.** |
| `moderationVisibility` | `string` | `visible` \| `hidden`. **Admin/moderation-controlled — see below.** |
| `createdAt` | `ts` | |
| `updatedAt` | `ts` | Also the Discovery pagination sort key. |

`photos[]` element:

| Field | Type |
|---|---|
| `id` | `string` |
| `storagePath` | `string` |
| `downloadUrl` | `string` |
| `sortOrder` | `int` |
| `isPrimary` | `bool` |

**Read:** owner, or any signed-in user when `visibility == 'visible'` **and**
`moderationVisibility == 'visible'` **and** `publicProfileIsEligible(uid)`
(`profileComplete == true && isDeactivated == false`).

**Write:** owner only, and the rules **forbid the owner from ever changing
`moderationVisibility`** (create must be `'visible'`; update must leave it unchanged).
That is deliberate and correct: `moderationVisibility` is the profile-hiding moderation lever,
writable *only* by a Cloud Function via the Admin SDK. The trust model the brief describes is
already half-built here.

## 4. `swipes/{uid}/given/{targetUid}` — a user's own like/pass decisions

| Field | Type | Notes |
|---|---|---|
| `decision` | `string` | `like` \| `pass` |
| `createdAt` | `ts` | |

Doc ID is the target's uid, so "have I already decided on this person" is an existence check.
**Read/write:** owner only.

## 5. `swipes/{uid}/receivedFrom/{fromUid}` — mirrored inbox ("who liked me")

Same field shape as `given`. Written by `DiscoveryFirestoreService.recordDecision`, which
batches both sides in one commit.

**Read:** owner (`get` and `list`). **Create:** any signed-in user, where `fromUid` must equal
their own uid. **Update/delete: nobody** — which means `dismissReceivedLike()`
(`matching_firestore_service.dart`) calls `.delete()` on a path the rules unconditionally deny.
See [Gap G6](#g6--dismissreceivedlike-deletes-a-document-the-rules-forbid-deleting).

## 6. `blocks/{uid}/blocked/{targetUid}`

| Field | Type |
|---|---|
| `blockedAt` | `ts` |

**Read:** owner may `list` and `get`; a *third party* may `get` only the single document whose
ID is their own uid (so Discovery can ask "did this person block me" without enumerating).
**Write:** owner only.

## 7. `matches/{matchId}`

`matchId` is the two uids **sorted ascending** and joined with `_`: `${ids[0]}_${ids[1]}`.

| Field | Type | Notes |
|---|---|---|
| `uids` | `string[2]` | Sorted. Rules enforce `size() == 2` and that the ID matches. |
| `status` | `string` | `active` \| `unmatched`. Unmatch is a soft delete. |
| `createdAt` | `ts` | |

**Read:** either participant. **Create:** a participant, but only when the rules independently
verify *either* `likedEachOther(uids)` (both `swipes/*/given/*` docs exist with
`decision == 'like'`) *or* `repliedIcebreaker(uids)`. This is the one place the mobile app
achieves trustworthy privileged state without a Cloud Function — verified server-side in rules,
not asserted by the client. **Update:** either participant, `active → unmatched` only, `status`
being the only key allowed to change. **Delete:** nobody.

## 8. `matches/{matchId}/messages/{messageId}` — chat

Auto-ID documents, written by `ChatFirestoreService`.

| Field | Type | Notes |
|---|---|---|
| `senderId` | `string` | |
| `type` | `string` | `text` \| `image` |
| `text` | `string?` | Present when `type == 'text'`. |
| `imageUrl` | `string?` | Present when `type == 'image'`. Domain-side field is named `imagePath`. |
| `sentAt` | `ts` | Sort key, descending. |
| `status` | `string` | `sending` \| `sent` \| `delivered` \| `read` \| `failed` |

> ⚠️ **This collection has no security rule at all.** See [Gap G1](#g1--chat-is-denied-by-the-current-rules) — this is currently the single most serious defect in the schema.

## 9. `matches/{matchId}/meta/typing`

| Field | Type | Notes |
|---|---|---|
| `typingUntil` | `ts` | Typing shown while this is in the future. |

Same missing-rule problem as `messages`.

## 10. `icebreakers/{senderId_recipientId}` — one pre-match message

Deterministic **directional** ID (unlike `matchId`, which is sorted).

| Field | Type | Notes |
|---|---|---|
| `senderId` | `string` | Must equal `request.auth.uid` on create. |
| `recipientId` | `string` | |
| `message` | `string` | Rules enforce length 1–200. |
| `sentAt` | `ts` | |
| `status` | `string` | `pending` \| `replied` \| `ignored` |

**Read:** sender or recipient. **Create:** sender, `status` must be `pending`.
**Update:** recipient only, `pending → replied \| ignored`, `status` the only changed key.
A sender can never mark their own icebreaker `replied` — which is exactly what would let a
client fabricate the match-creation precondition in §7. **Delete:** nobody.

This collection is **not in the blueprint's suggested structure** — see [Conflict C2](#c2--collection-naming-mobile-code-vs-the-briefs-suggested-structure).

## 11. `reports/{reportId}` — auto-ID

Written by `SafetyFirestoreService.submitReport` via `.add()`.

| Field | Type | Notes |
|---|---|---|
| `reporterId` | `string` | Must equal `request.auth.uid`. |
| `targetId` | `string` | |
| `reason` | `string` | `fakeProfile` \| `inappropriatePhotos` \| `harassmentOrAbuse` \| `spam` \| `underage` \| `other` |
| `description` | `string?` | |
| `createdAt` | `ts` | |

**Read: nobody. Update: nobody. Delete: nobody.** Write-only from the client, by design.

> ⚠️ The dashboard's entire Phase C depends on reading this collection, and on `status` /
> `priority` fields that **do not exist**. See [Gap G3](#g3--reports-has-no-status-priority-or-resolution-fields) and [Addition A2](#a2--reportsreportid--moderation-fields).

## 12. `entitlements/{uid}` — premium entitlement

| Field | Type | Notes |
|---|---|---|
| `active` | `bool` | |
| `purchasedAt` | `ts \| null` | |

**Read:** owner. **Write: `if false`** — nobody, including the owner. In production this is
written exclusively by a Cloud Function reacting to a verified App Store / Play Store server
notification. `FirebaseMonetizationRepository.purchasePremium` returns `not-implemented`
rather than letting a client self-grant premium. This is the correct posture and the dashboard
must not weaken it.

> ⚠️ There are **no payment records anywhere in the schema**. Agreement §2.4 and blueprint AD05
> both require them. See [Addition A3](#a3--payments--the-missing-agreement-24-deliverable).

## 13. `rewardedAdUsage/{uid}/byType/{rewardType}`

`rewardType` ∈ `receivedLikeReveal` \| `discoveryBonusLikes` \| `discoveryRewind` \| `icebreaker`.

| Field | Type | Notes |
|---|---|---|
| `date` | `daykey` | |
| `used` | `int` | |

**Read/write:** owner. Explicitly documented in both the rules and the service as a *soft*
trust posture — client-reported, not hardened against a client under-reporting its own usage.

> The `claimId` that `RewardedAdFirestoreService.claim()` returns
> (`{uid}_{type}_{daykey}_{n}`) is **never persisted**. SCOPE.md §1 claims "unique claim IDs,
> no double-grants"; that holds in-process but is not enforced server-side. See [Gap G7](#g7--rewarded-ad-claim-ids-are-generated-but-never-stored).

## 14. Cloud Storage — `users/{uid}/profile_photos/{photoId}`

**Read:** owner, or any signed-in user when `profileIsVisible(uid)` (cross-checks both
`profiles/{uid}` and `users/{uid}` in Firestore). **Create/update:** owner, ≤ 8 MB,
`contentType` must match `image/*`. **Delete:** owner.

Admin needs read access here for report review (blueprint AD04: *"review profile, message or
image context"*). It does not have it — a reported user whose profile is already hidden fails
`profileIsVisible`, so the evidence becomes unreadable at exactly the moment it is needed.
See [Addition A5](#a5--storage-rules-admin-read).

---

# Part 2 — Required additions for the admin dashboard

None of this exists yet. Each is required by the agreement or the blueprint, and each is
**Cloud-Function-written, dashboard-read-only**.

## A1. `users/{uid}` — moderation fields

The single most important addition. See [Gap G4](#g4--there-is-no-admin-suspensionban-field-at-all) for why `isDeactivated` cannot be reused.

| Field | Type | Writer | Notes |
|---|---|---|---|
| `moderationStatus` | `string` | **fn** | `active` \| `suspended` \| `banned`. Default `active`. |
| `suspendedUntil` | `ts \| null` | **fn** | Set when `suspended`; `null` otherwise. |
| `moderationReason` | `string \| null` | **fn** | Free text shown in the dashboard's audit view. |
| `moderationUpdatedAt` | `ts \| null` | **fn** | |
| `moderationUpdatedBy` | `string \| null` | **fn** | Admin uid. |

Rules change required: add these to the owner's **read** set, and explicitly **exclude** them
from the owner's `update` `hasOnly` list (which currently allows only
`profileComplete, locale, isDeactivated, updatedAt` — so they are already excluded by
construction; this must stay true when the list is edited).

Suspend/ban must **also** set `profiles/{uid}.moderationVisibility = 'hidden'` in the same
Function, since that is what actually removes the profile from Discovery.

## A2. `reports/{reportId}` — moderation fields

| Field | Type | Writer | Notes |
|---|---|---|---|
| `status` | `string` | **fn** | `open` \| `inReview` \| `resolved` \| `dismissed`. Default `open`, set by a Function trigger on create (not by the reporting client). |
| `priority` | `string` | **fn** | `low` \| `normal` \| `high`. Derived: `reason == 'underage'` → `high`. Blueprint AD04 requires queue-by-priority. |
| `assignedTo` | `string \| null` | **fn** | Admin uid. |
| `resolutionNotes` | `string \| null` | **fn** | Blueprint AD04: *"resolve with notes."* |
| `resolutionAction` | `string \| null` | **fn** | `none` \| `warned` \| `profileHidden` \| `suspended` \| `banned`. Ties Phase C to Phase B. |
| `resolvedAt` | `ts \| null` | **fn** | |
| `resolvedBy` | `string \| null` | **fn** | Admin uid. |

`status` and `priority` must be **backfilled onto existing documents** before the queue can
sort or filter, otherwise `where('status', '==', 'open')` silently skips every report written
before the change.

## A3. `payments/{paymentId}` — the missing Agreement §2.4 deliverable

Nothing in the mobile app records a payment. Agreement §2.4 ("subscriptions, payment records")
and blueprint AD05 both require it. Proposed top-level collection, auto-ID:

| Field | Type | Writer | Notes |
|---|---|---|---|
| `uid` | `string` | **fn** | |
| `platform` | `string` | **fn** | `appStore` \| `playStore` |
| `productId` | `string` | **fn** | |
| `originalTransactionId` | `string` | **fn** | Store-side identity; also the idempotency key. |
| `amountMinor` | `int` | **fn** | Minor units. Prices are in **RWF** (SCOPE.md). |
| `currency` | `string` | **fn** | ISO 4217, e.g. `RWF`. |
| `status` | `string` | **fn** | `paid` \| `pending` \| `failed` \| `refunded` \| `cancelled` |
| `purchasedAt` | `ts` | **fn** | |
| `expiresAt` | `ts \| null` | **fn** | |
| `rawNotificationId` | `string \| null` | **fn** | Audit trail back to the store notification. |

**Read:** admin only. Never client-readable. Blueprint AD05 is explicit: *"no direct editing of
store transactions"* — so the dashboard is read-only here **by contract**, not just by
convention. Phase D must not offer an edit affordance.

`entitlements/{uid}` should gain `expiresAt`, `productId`, and `platform` so the dashboard can
show plan status without joining to `payments`.

## A4. `adminAudit/{entryId}` — audit log

Not named in the agreement, but any action that can ban a user needs a record of who did it.
Auto-ID, **fn**-written, admin-read.

| Field | Type | Notes |
|---|---|---|
| `adminUid` | `string` | |
| `adminEmail` | `string` | Denormalised so the log survives admin account deletion. |
| `action` | `string` | `suspendUser` \| `banUser` \| `reinstateUser` \| `resolveReport` \| `hideProfile` \| `overrideEntitlement` |
| `targetType` | `string` | `user` \| `report` \| `entitlement` |
| `targetId` | `string` | |
| `before` | `map \| null` | Prior state of the changed fields. |
| `after` | `map \| null` | |
| `reason` | `string \| null` | |
| `createdAt` | `ts` | |

Every callable in [Part 3](#part-3--cloud-function-surface) writes exactly one of these.

## A5. Storage rules — admin read

`storage.rules` needs an `isAdmin()` branch on `users/{uid}/profile_photos/{photoId}` so that
report review can see the image evidence for a profile that is already hidden.

```
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}
// in match /users/{uid}/profile_photos/{photoId}:
allow read: if owns(uid) || isAdmin() || (signedIn() && profileIsVisible(uid));
```

## A6. Admin read scope for private fields

`users/{uid}/private/settings` holds `phoneNumber` and real `dateOfBirth`. Both are legitimately
needed: `phoneNumber` for the duplicate-account/fraud signal it is documented as existing for,
`dateOfBirth` for `underage` reports, where the precomputed `displayAge` is exactly the value
under suspicion.

**Recommendation:** do **not** open `users/{uid}/private/**` to admin reads wholesale. Expose
these two fields through a callable (`getUserModerationDetail`) that returns them explicitly and
writes an `adminAudit` entry. Reading a user's private data is itself an auditable act, and a
blanket rule leaves no record of it. Agreement §7 puts responsibility for lawful use of user
data on the client; §9 obliges us to access controls — a narrow, logged path satisfies both,
a wildcard read does not.

## A7. Composite indexes the dashboard will need

`firestore.indexes.json` currently has exactly one index (the Discovery query). Add:

| Collection | Fields |
|---|---|
| `reports` | `status` ASC, `priority` DESC, `createdAt` DESC |
| `reports` | `targetId` ASC, `createdAt` DESC |
| `payments` | `uid` ASC, `purchasedAt` DESC |
| `payments` | `status` ASC, `purchasedAt` DESC |
| `adminAudit` | `targetId` ASC, `createdAt` DESC |
| `users` | `moderationStatus` ASC, `createdAt` DESC |

See also [Gap G5](#g5--a-missing-index-the-mobile-app-already-needs), an index the *mobile* app already needs and does not have.

---

# Part 3 — Cloud Function surface

Every privileged write. All callable (`onCall`), all guarded by
`context.auth.token.admin === true`, all writing an `adminAudit` entry.

| Callable | Writes | Phase |
|---|---|---|
| `adminSuspendUser` | `users/{uid}` moderation fields, `profiles/{uid}.moderationVisibility` | B |
| `adminBanUser` | as above + Auth `disabled: true` | B |
| `adminReinstateUser` | reverts both | B |
| `adminResolveReport` | `reports/{id}` resolution fields | C |
| `adminAssignReport` | `reports/{id}.assignedTo`, `.status` | C |
| `adminOverrideEntitlement` | `entitlements/{uid}` | D |
| `adminGetUserModerationDetail` | reads private fields, writes audit | B/C |
| `onReportCreated` (trigger) | backfills `status`, `priority` | C |

**Ban vs suspend.** Ban sets Firebase Auth `disabled: true`, which revokes the session at the
Auth layer and is not recoverable by the user. Suspend leaves Auth intact and relies on
`moderationStatus` + `suspendedUntil`, so the mobile app must **read and honour** it — which it
does not yet do. That is mobile-side integration work, flagged here so it is not discovered
late: **a suspension the mobile app ignores is not a suspension.**

---

# Conflicts

## C1 — The blueprint has no schema, and no Section 15

The brief cites *"the Umuranga blueprint document, Section 15 (Admin dashboard) and Section 11
(admin design direction)."* The blueprint (`Umuranga_Mobile_App_Blueprint.pdf`) has **14
sections**. There is no Section 15. Section 11 is *"Admin dashboard lifecycle — supporting
scope"* and contains **both** the AD01–AD07 functional scope *and* the "Admin design direction"
bullets — i.e. one section holds what the brief describes as two.

The brief also attributes a Firestore structure to the blueprint
(`users/{uid}`, `profiles/{uid}`, `matches/{matchId}`, …). **The blueprint contains no schema
of any kind** — it is a UI/UX document. Searching it for `firestore`, `collection`, `schema`, or
`uid` returns nothing relevant.

**Recommended resolution:** treat blueprint §11 as the sole blueprint source for both dashboard
scope and dashboard design, and treat the brief's collection list as *the brief's own proposal*,
not a blueprint citation. Since it conflicts with shipped mobile code (below), the mobile code
wins. No document needs changing; the citation does. Worth confirming with the client that no
second revision of the blueprint exists that I have not been given.

## C2 — Collection naming: mobile code vs the brief's suggested structure

| Brief's suggested path | Actually implemented | Resolution |
|---|---|---|
| `users/{uid}/swipes/{targetUid}` | `swipes/{uid}/given/{targetUid}` | **Keep implemented.** |
| `users/{uid}/receivedLikes/{sourceUid}` | `swipes/{uid}/receivedFrom/{fromUid}` | **Keep implemented.** |
| `blocks/{uid}/items/{blockedUid}` | `blocks/{uid}/blocked/{targetUid}` | **Keep implemented.** |
| `subscriptions/{uid}` | `entitlements/{uid}` | **Keep implemented** — the name is more accurate: it is an entitlement flag, not a subscription record. Blueprint AD05's "subscriptions" surface reads `entitlements` + the new `payments`. |
| `rewardClaims/{uid}/items/{claimId}` | `rewardedAdUsage/{uid}/byType/{type}` | **Not equivalent.** The brief describes a claim *log*; the implementation is a daily *counter*. See [Gap G7](#g7--rewarded-ad-claim-ids-are-generated-but-never-stored). |
| `notifications/{uid}/items/{notificationId}` | **does not exist** | Push notifications are unbuilt (SCOPE.md §3). Out of scope for Phases A–F. Defer. |
| `appConfig/public` | **does not exist** | Nothing reads remote config today. Do not create it speculatively. |
| — | `icebreakers/{senderId_recipientId}` | Exists, not in the brief's list. See below. |
| — | `users/{uid}/private/{discoveryUsage, discoveryBonusUsage, discoveryFilters, revealedLikers}` | Exist, not in the brief's list. |

**Why the implemented names win in every case:** they are already in `firestore.rules`, in
`firestore.indexes.json`, and in ten `*FirestoreService` classes. Renaming them buys nothing and
costs a coordinated migration across a frozen mobile codebase. The brief's list was a
suggestion; the code is the contract.

**`icebreakers` is a scope question, not just a schema one.** It does not appear in Agreement
§2.2–2.4, and unlike Rewind it is not listed in SCOPE.md §7 ("Built outside the contract").
Chat is contracted as *"private chat after matching"* — an icebreaker is a message **before**
matching, and it is a second path to creating a match (`repliedIcebreaker` in the rules). The
dashboard will surface it (moderation needs to see pre-match messages, which are a classic
harassment vector). **Recommendation: raise it with the client alongside Rewind.** I have
included it in the schema because it is shipped and moderation must cover it — that is not the
same as ruling it in-contract.

## C3 — Agreement §2.4 vs blueprint AD05 on subscriptions

§2.4 says the dashboard will *"manage … subscriptions, payment records"*. Blueprint AD05 says
*"View plan status and payment records; **no direct editing of store transactions**."*

**Recommended resolution:** follow AD05. "Manage" cannot mean editing store transactions —
those live in Apple's and Google's systems and a Firestore write would desynchronise from the
store, not change anything real. Phase D is read-only over `payments`, plus one narrow
`adminOverrideEntitlement` callable for genuine support cases (a paid user whose entitlement
failed to apply), which writes an audit entry and never touches `payments`. That satisfies
"manage" honestly. **Flag for client confirmation** — it is the one place where the two
documents could be read as promising different products.

---

# Gaps and defects found in the mobile implementation

These were found while reading the code for Task 0. They are **mobile-side bugs**, not dashboard
work, but several block the dashboard and all of them will bite at backend integration.

## G1 — Chat is denied by the current rules

`matches/{matchId}/messages/**` and `matches/{matchId}/meta/typing` have **no `match` block** in
`firestore.rules`. Firestore rules do not cascade into subcollections, and the terminal
`match /{document=**} { allow read, write: if false; }` catches them. **Every read and write in
`ChatFirestoreService` fails with `permission-denied` against a real project.**

This is invisible today only because the app runs on demo repositories. **Severity: high.**

Fix — add inside `match /matches/{matchId}`:

```
function isParticipant() {
  return signedIn() &&
    request.auth.uid in get(/databases/$(database)/documents/matches/$(matchId)).data.uids;
}
function matchIsActive() {
  return get(/databases/$(database)/documents/matches/$(matchId)).data.status == 'active';
}
match /messages/{messageId} {
  allow read: if isParticipant();
  allow create: if isParticipant() && matchIsActive() &&
    request.resource.data.senderId == request.auth.uid &&
    request.resource.data.sentAt == request.time;
  // read receipts: recipient flips status only
  allow update: if isParticipant() &&
    resource.data.senderId != request.auth.uid &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']);
  allow delete: if false;
}
match /meta/typing {
  allow read, write: if isParticipant();
}
```

## G2 — The dashboard has no read path into anything

`firestore.rules` has no `isAdmin()` function and no admin branch anywhere. Concretely:

- `reports` — `allow read: if false`. **The Phase C queue cannot load.**
- `profiles/{uid}` — readable only when `visibility == 'visible' && moderationVisibility == 'visible'`. **A suspended or hidden profile becomes invisible to the moderator who suspended it.**
- `users/{uid}` — owner-only. **The Phase B user list cannot load.**
- `entitlements/{uid}` — owner-only. **Phase D cannot load.**

**Fix:** add `function isAdmin() { return request.auth != null && request.auth.token.admin == true; }`
and `|| isAdmin()` on the **read** clause of `users`, `profiles`, `reports`, `entitlements`,
`matches`, and the new `payments` / `adminAudit`. **Never on a write clause** — writes stay
Function-only, per the trust model. Phase F work; Phases B–E run against the emulator with these
rules in place until then.

## G3 — `reports` has no status, priority, or resolution fields

The client writes five fields; the blueprint's AD04 queue needs `status` and `priority` to exist
and needs `resolve with notes` to have somewhere to write. Covered by [Addition A2](#a2--reportsreportid--moderation-fields). Without it Phase C has no queue, only a flat list.

## G4 — There is no admin suspension/ban field at all

`isDeactivated` is the only account-state field, and `firestore.rules` lets the **owner** set it
in either direction (`allow update: … hasOnly([… 'isDeactivated' …])`). If an admin used it to
suspend someone, that person reopens the app and reactivates themselves. It is a
self-deactivation feature, not a moderation lever, and reusing it would be a security bug.

`profiles/{uid}.moderationVisibility` *is* correctly admin-only, but it only hides the profile
from Discovery — it does not stop the account signing in, messaging existing matches, or
sending icebreakers.

**Fix:** [Addition A1](#a1--usersuid--moderation-fields), plus mobile-side enforcement. **This blocks Phase B.**

## G5 — A missing index the mobile app already needs

`MatchingFirestoreService.getMatches` and `getReceivedLikes` both run:

```
matches.where('uids', arrayContains: uid).where('status', isEqualTo: 'active')
```

An `array-contains` combined with an equality filter requires a composite index.
`firestore.indexes.json` contains only the `profiles` index. **This query will fail at runtime
against a real project.** Add: `matches` — `uids` ARRAY_CONTAINS, `status` ASC.

## G6 — `dismissReceivedLike` deletes a document the rules forbid deleting

`matching_firestore_service.dart` calls `_receivedFrom(uid).doc(likerId).delete()`. The rule for
`swipes/{uid}/receivedFrom/{fromUid}` is `allow update, delete: if false` — unconditional, with
no owner exception. The call always fails.

Either the rule should allow the owner to delete their own inbox entry, or dismissal should be a
soft flag. The rule's own comment does not explain the omission, which suggests it is an
oversight rather than a decision. **Recommend: allow owner delete.**

## G7 — Rewarded-ad claim IDs are generated but never stored

`RewardedAdFirestoreService.claim()` builds `claimId = '{uid}_{type}_{daykey}_{n}'` and returns
it, but writes only `{date, used}`. Nothing persists the claim. SCOPE.md §1 describes "unique
claim IDs, no double-grants" as delivered; server-side, only the counter exists, and the rules
themselves note this is client-reported and not hardened.

Not dashboard-blocking. Flagged because SCOPE.md overstates it, and because the counter is the
thing an abuse investigation in Phase C would rely on.

## G8 — `displayAge` is a precomputed int that goes stale

`ProfileFirestoreMapper.publicData` computes `displayAge` at save time. A user who does not
re-save their profile never ages. Discovery's age filtering reads it back through
`DiscoveryCandidateMapper`, which *synthesises a fake `dateOfBirth`* from it.

For the dashboard this matters in one specific place: an `underage` report must be reviewed
against the real `dateOfBirth` in `users/{uid}/private/settings`, **never** against
`displayAge`. Handled by [Addition A6](#a6--admin-read-scope-for-private-fields).

Longer-term fix (mobile-side): a scheduled Function recomputing `displayAge`, or store
`birthYear` publicly and compute age at read time.

## G9 — `ChatFirestoreService.markAsRead` uses two `!=` filters in one query

```dart
.where('senderId', isNotEqualTo: uid).where('status', isNotEqualTo: MessageStatus.read.name)
```

Firestore permits **at most one** `!=` / `not-in` filter per query. This throws before it
reaches the network. Fix: query `where('senderId', isNotEqualTo: uid)` and filter `status`
client-side, or maintain an unread counter on the match document.

## G10 — `saveProfile` can violate its own update rule

`ProfileFirestoreService.saveProfile` writes `'createdAt': profile.accountCreatedAt ?? now` to
`users/{uid}` on every save. The update rule allows only
`['profileComplete', 'locale', 'isDeactivated', 'updatedAt']` to change. When
`accountCreatedAt` is `null` on an already-existing document — which happens whenever a profile
is constructed without the account document having been read — this writes a fresh
`serverTimestamp()`, `createdAt` lands in `diff().affectedKeys()`, and the **entire batch is
rejected**, silently losing the profile and settings writes too.

Fix: omit `createdAt` from the update path entirely, or set it only via
`SetOptions(mergeFields:)` on first create.

---

# Summary of what blocks what

| Dashboard phase | Blocked by | Emulator-testable now? |
|---|---|---|
| A — Foundation | nothing | ✅ Yes |
| B — Users & profiles | [G2](#g2--the-dashboard-has-no-read-path-into-anything), [G4](#g4--there-is-no-admin-suspensionban-field-at-all), [A1](#a1--usersuid--moderation-fields) | ✅ With A1 + G2 rules applied |
| C — Reports & moderation | [G2](#g2--the-dashboard-has-no-read-path-into-anything), [G3](#g3--reports-has-no-status-priority-or-resolution-fields), [A2](#a2--reportsreportid--moderation-fields), [A5](#a5--storage-rules--admin-read) | ✅ With A2 + G2 rules applied |
| D — Subscriptions & payments | [A3](#a3--payments--the-missing-agreement-24-deliverable) (collection does not exist), [C3](#c3--agreement-24-vs-blueprint-ad05-on-subscriptions) unresolved | ⚠️ Seeded data only — no real payments exist anywhere |
| E — Statistics | [G2](#g2--the-dashboard-has-no-read-path-into-anything) | ✅ Seeded data |
| F — Hardening | — | ✅ This is where G1/G2/G5/G6 get fixed |

**Mobile-side fixes that should not wait for the dashboard:** [G1](#g1--chat-is-denied-by-the-current-rules) (chat is broken), [G5](#g5--a-missing-index-the-mobile-app-already-needs) (matches query fails),
[G9](#g9--chatfirestoreservicemarkasread-uses-two--filters-in-one-query) (throws), [G10](#g10--saveprofile-can-violate-its-own-update-rule) (silent data loss). None are dashboard work; all four are
latent because the app currently runs on demo repositories, and all four fire on the first day
of real backend integration.
