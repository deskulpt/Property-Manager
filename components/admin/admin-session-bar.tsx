import { SessionSwitcher, type SwitchUser } from "@/components/session-switcher"
import { ROLE_LEVEL_LABEL, type RoleLevel } from "@/lib/role-level"
import { roleLabel, type Role } from "@/lib/format"

export function AdminSessionBar({
  users,
  currentId,
  tenantName,
  role,
  roleLevel,
}: {
  users: SwitchUser[]
  currentId: string
  tenantName: string | null
  role: Role | null
  roleLevel: RoleLevel | null
}) {
  const tenantLabel = tenantName?.trim() || "Platform"
  const staffLabel = role ? roleLabel(role) : "Visitor"
  const levelLabel = roleLevel != null ? ROLE_LEVEL_LABEL[roleLevel] : "—"

  return (
    <div
      data-testid="admin-session-bar"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 print:hidden"
    >
      <div
        className="pointer-events-auto border-t border-cyan-400/30 bg-brand text-paper shadow-[0_-8px_24px_rgba(10,22,36,0.35)]"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            <p className="truncate">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9ed0e0]">
                TenantID
              </span>{" "}
              <span className="font-semibold text-paper">{tenantLabel}</span>
            </p>
            <span className="hidden text-paper/25 sm:inline" aria-hidden>
              ·
            </span>
            <p className="truncate">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9ed0e0]">
                Staff
              </span>{" "}
              <span className="font-semibold text-paper">{staffLabel}</span>
              <span className="ml-1 font-mono text-[10px] text-paper/55">({levelLabel})</span>
            </p>
          </div>
          <SessionSwitcher users={users} currentId={currentId} variant="bar" />
        </div>
      </div>
    </div>
  )
}
