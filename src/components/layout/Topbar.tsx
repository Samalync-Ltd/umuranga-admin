import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { useAdminAuth, useAdminSession } from "@/features/auth/useAdminAuth";

export function Topbar({ usingEmulators }: { usingEmulators: boolean }) {
  const session = useAdminSession();
  const { signOut } = useAdminAuth();

  return (
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-border bg-surface px-5">
      {/* An emulator session must be impossible to mistake for production —
          the same discipline the mobile app applies to its demo-tools flag. */}
      {usingEmulators ? <StatusChip tone="warn">Emulator</StatusChip> : null}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-meta text-fg-muted">{session.email ?? session.uid}</span>
        <StatusChip tone="ok">Admin</StatusChip>
        <Button variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
