import { DeskShell, type DeskLink, type DeskRoleTheme } from "@/components/desk-shell"

export type { DeskLink, DeskRoleTheme }

/** Shared role desk chrome — DaisyUI drawer + mobile bottom nav. */
export function PortalFrame({
  kicker,
  title,
  links,
  role = "l2",
  children,
}: {
  kicker: string
  title: string
  links: DeskLink[]
  role?: DeskRoleTheme
  children: React.ReactNode
}) {
  return (
    <DeskShell kicker={kicker} title={title} links={links} role={role}>
      {children}
    </DeskShell>
  )
}
