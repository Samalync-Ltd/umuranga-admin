import { PhasePlaceholder } from "@/routes/pages/PhasePlaceholder";

export function SubscriptionsPage() {
  return (
    <PhasePlaceholder
      title="Subscriptions"
      ad="AD05"
      phase="D"
      delivers={[
        "Plan status per user, read from entitlements/{uid}",
        "Payment records — read-only. Blueprint AD05 forbids editing store transactions",
        "An honest empty state until real payment data exists, not placeholder rows",
      ]}
      blockedBy={[
        "A3 — the payments collection does not exist anywhere yet",
        "C3 — Agreement §2.4 says 'manage subscriptions'; blueprint AD05 says view-only. Needs client confirmation",
      ]}
    />
  );
}
