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
        className="pointer-events-auto border-t border-[#9ed0e0]/35 bg-brand text-paper"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            <p className="flex min-w-0 items-center gap-1.5 truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-[#9ed0e0]" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9ed0e0]">
                Landlord org
              </span>{" "}
              <span className="font-semibold text-paper">{orgLabel}</span>
            </p>
            <span className="hidden text-paper/25 sm:inline" aria-hidden>
              ·
            </span>
            <p className="flex min-w-0 items-center gap-1.5 truncate">
              <UserCog className="h-3.5 w-3.5 shrink-0 text-[#9ed0e0]" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9ed0e0]">
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
