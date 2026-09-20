import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AccountPage } from "@/routes/pages/AccountPage";
import { NotFoundPage } from "@/routes/pages/NotFoundPage";
import { OverviewPage } from "@/routes/pages/OverviewPage";
import { ReportsPage } from "@/routes/pages/ReportsPage";
import { StatisticsPage } from "@/routes/pages/StatisticsPage";
import { SubscriptionsPage } from "@/routes/pages/SubscriptionsPage";
import { UsersPage } from "@/routes/pages/UsersPage";

/**
 * The whole route table sits inside <RequireAdmin> (see App.tsx), so there is
 * no unauthenticated route to guard individually and no `/login` path — the
 * login form *is* the signed-out state of the gate. That keeps it impossible
 * to add a route later that accidentally renders outside the guard.
 */
export function AppRoutes({ usingEmulators }: { usingEmulators: boolean }) {
  return (
    <Routes>
      <Route element={<AppShell usingEmulators={usingEmulators} />}>
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
