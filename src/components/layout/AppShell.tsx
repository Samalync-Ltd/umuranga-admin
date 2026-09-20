import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

/**
 * Desktop-first, fixed-sidebar shell. Blueprint §11: "must remain usable on
 * common laptop widths before optimizing for mobile" — so the sidebar does not
 * collapse and the content column does not reflow below 1280px. Responsive
 * behaviour is Phase F.
 */
export function AppShell({ usingEmulators }: { usingEmulators: boolean }) {
  return (
    <div className="flex h-full min-w-[1024px]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar usingEmulators={usingEmulators} />
        <main className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
