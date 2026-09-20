import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "@/routes/navigation";

// Black sidebar, per blueprint §11's first option. The active item is marked
// by a red rule and a lighter surface — red as an indicator, not a fill.
export function Sidebar() {
  return (
    <nav
      aria-label="Sections"
      className="flex w-[var(--sidebar-width)] shrink-0 flex-col bg-nav text-nav-fg"
    >
      <div className="flex h-[var(--topbar-height)] items-center px-4 text-section font-bold tracking-tight">
        Umuranga <span className="ml-1.5 text-brand-red">Admin</span>
      </div>
      <ul className="flex flex-col gap-0.5 px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                "flex items-center justify-between rounded-md border-l-2 px-3 py-1.5 text-body " +
                "transition-colors duration-200 ease-[var(--ease-standard)] " +
                (isActive
                  ? "border-brand-red bg-nav-active font-medium text-nav-fg"
                  : "border-transparent text-nav-fg-muted hover:bg-nav-hover hover:text-nav-fg")
              }
            >
              <span>{item.label}</span>
              <span className="text-caption text-nav-fg-muted/70">{item.ad}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <p className="mt-auto px-4 py-3 text-caption text-nav-fg-muted">
        Phase A — foundation. Sections marked with a later phase are not built yet.
      </p>
    </nav>
  );
}
