import type { ReactNode } from "react";

/** The full-page frame used by every pre-session surface (login, denied, error). */
export function CenteredPanel({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center bg-surface-sunken p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-7 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <span className="text-page font-bold tracking-tight text-brand-black">
            Umuranga <span className="text-brand-red">Admin</span>
          </span>
          <span className="text-caption text-fg-subtle">Internal moderation console</span>
        </div>
        {children}
      </div>
    </main>
  );
}
