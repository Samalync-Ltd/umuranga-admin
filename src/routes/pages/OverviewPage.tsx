import { PhasePlaceholder } from "@/routes/pages/PhasePlaceholder";

export function OverviewPage() {
  return (
    <PhasePlaceholder
      title="Overview"
      ad="AD02"
      phase="E"
      delivers={[
        "User totals and active-user counts",
        "Match and report totals with trend cards",
        "Subscription summary",
      ]}
      blockedBy={[
        "G2 — firestore.rules has no admin read branch, so none of these collections are readable yet",
      ]}
    />
  );
}
