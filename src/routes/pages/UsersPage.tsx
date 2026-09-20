import { PhasePlaceholder } from "@/routes/pages/PhasePlaceholder";

export function UsersPage() {
  return (
    <PhasePlaceholder
      title="Users"
      ad="AD03"
      phase="B"
      delivers={[
        "Searchable, filterable user list with moderation status chips",
        "Profile detail view, including photos and report history",
        "Suspend, ban and reinstate — each via a Cloud Function callable, never a direct write",
      ]}
      blockedBy={[
        "A1 — users/{uid} has no moderationStatus field; isDeactivated is user-controlled and cannot be used to suspend",
        "G2 — no admin read branch in firestore.rules",
      ]}
    />
  );
}
