import type { ReactNode } from "react";

/**
 * The status vocabulary used across every table in the dashboard
 * (blueprint §11: "Tables use clear status chips").
 *
 * `urgent` is the only red tone and is reserved for state a moderator must
 * act on — banned accounts, high-priority reports. Routine negative state
 * (`warn`) is amber, so red keeps meaning "look at this now".
 */
export type ChipTone = "neutral" | "ok" | "warn" | "urgent" | "info";

const TONES: Record<ChipTone, string> = {
  neutral: "bg-status-neutral-bg text-status-neutral",
  ok: "bg-status-ok-bg text-status-ok",
  warn: "bg-status-warn-bg text-status-warn",
  urgent: "bg-status-urgent-bg text-status-urgent",
  info: "bg-status-info-bg text-status-info",
};

export function StatusChip({ tone = "neutral", children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
