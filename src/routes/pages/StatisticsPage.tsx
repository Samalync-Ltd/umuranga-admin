import { PhasePlaceholder } from "@/routes/pages/PhasePlaceholder";

export function StatisticsPage() {
  return (
    <PhasePlaceholder
      title="Statistics"
      ad="AD06"
      phase="E"
      delivers={[
        "User totals, active users, matches and reports over a selectable date range",
        "Simple charts, within the scope agreed in §2.4",
      ]}
      blockedBy={["G2 — no admin read branch in firestore.rules"]}
    />
  );
}
