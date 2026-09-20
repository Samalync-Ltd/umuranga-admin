import { StatusChip } from "@/components/ui/StatusChip";

/**
 * A route that exists but is not built yet.
 *
 * The mobile app's CLAUDE.md treats placeholder-looking screens as bugs. That
 * rule is about screens that *pretend* to be finished. This one says exactly
 * what it is, which phase delivers it, and what is blocking it — so the
 * routing skeleton can be navigated and reviewed without anything looking
 * shipped that isn't.
 */
export function PhasePlaceholder({
  title,
  ad,
  phase,
  delivers,
  blockedBy,
}: {
  title: string;
  ad: string;
  phase: string;
  delivers: readonly string[];
  blockedBy?: readonly string[];
}) {
  return (
    <section className="max-w-3xl">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-page font-bold tracking-tight text-fg">{title}</h1>
        <StatusChip tone="neutral">{ad}</StatusChip>
        <StatusChip tone="info">Phase {phase}</StatusChip>
      </div>
      <p className="mb-5 text-body text-fg-muted">
        Not built. This route exists so the navigation skeleton is complete and reviewable.
      </p>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-2 text-section font-semibold text-fg">Phase {phase} will deliver</h2>
        <ul className="list-disc pl-5 text-body text-fg-muted marker:text-fg-subtle">
          {delivers.map((item) => (
            <li key={item} className="py-0.5">
              {item}
            </li>
          ))}
        </ul>

        {blockedBy && blockedBy.length > 0 ? (
          <>
            <h2 className="mt-5 mb-2 text-section font-semibold text-fg">
              Blocked until these land
            </h2>
            <ul className="list-disc pl-5 text-body text-fg-muted marker:text-fg-subtle">
              {blockedBy.map((item) => (
                <li key={item} className="py-0.5">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption text-fg-subtle">
              Each item is documented in FIRESTORE_SCHEMA.md.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
