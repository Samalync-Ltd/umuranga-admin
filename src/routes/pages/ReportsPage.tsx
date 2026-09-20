import { PhasePlaceholder } from "@/routes/pages/PhasePlaceholder";

export function ReportsPage() {
  return (
    <PhasePlaceholder
      title="Reports"
      ad="AD04"
      phase="C"
      delivers={[
        "Report queue filtered by status and priority",
        "Review context — the reported profile, message thread, or image",
        "Resolve with notes, with suspend and ban reachable from the same screen",
      ]}
      blockedBy={[
        "A2 — reports/{id} has no status, priority or resolution fields",
        "G2 — reports is currently `allow read: if false`, so the queue cannot load at all",
        "A5 — storage.rules gives admins no read access to a hidden profile's photos",
      ]}
    />
  );
}
