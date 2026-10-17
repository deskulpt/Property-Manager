import { Building2, UserCog } from "lucide-react"
import { SessionSwitcher, type SwitchUser } from "@/components/session-switcher"
import { roleLabel, type Role } from "@/lib/format"

/**
 * Sticky admin chrome — landlord org + staff role switcher.
 * Outer shell is pointer-events-none so page content stays clickable;
 * the bar itself is focusable and does not trap keyboard (single select + tab out).
 */
export function AdminSessionBar({
  users,
  currentId,
  tenantName,
  role,
}: {
  users: SwitchUser[]
  currentId: string
  tenantName: string | null
  role: Role | null
}) {
  const orgLabel = tenantName?.trim() || "Platform"
  const staffLabel = role ? roleLabel(role) : "Visitor"

  return (
    <div
      data-testid="admin-session-bar"
      role="region"
      aria-label="Landlord organisation and staff role switcher"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 print:hidden"
    >
      <div
        className="pointer-events-auto sticky-bar-accent bg-brand text-paper"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            <p className="flex min-w-0 items-center gap-1.5 truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-2-light" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-2-light">
                Landlord org
              </span>{" "}
              <span className="font-semibold text-paper">{orgLabel}</span>
            </p>
            <span className="hidden text-brand-3-light/70 sm:inline" aria-hidden>
              ·
            </span>
            <p className="flex min-w-0 items-center gap-1.5 truncate">
              <UserCog className="h-3.5 w-3.5 shrink-0 text-brand-3-light" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-3-light">
                Staff role
              </span>{" "}
              <span className="font-semibold text-paper">{staffLabel}</span>
            </p>
          </div>
          <SessionSwitcher users={users} currentId={currentId} variant="bar" />
        </div>
      </div>
    </div>
  )
}
