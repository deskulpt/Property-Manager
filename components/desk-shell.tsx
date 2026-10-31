"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useMemo } from "react"
import { InstallButton } from "@/components/pwa-register"
import {
  Briefcase,
  Building2,
  ClipboardList,
  CreditCard,
  Home,
  Inbox,
  Layers,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type DeskLink = {
  href: string
  label: string
  icon?: LucideIcon
  /** Prefer in mobile bottom nav (first 4–5 with this flag, else first 4). */
  primary?: boolean
}

export type DeskRoleTheme = "l0" | "l1" | "l2" | "l3" | "l4" | "l5"

const ICON_FALLBACKS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  home: Home,
  analytics: LayoutDashboard,
  tenants: Building2,
  landlords: Building2,
  properties: Building2,
  floors: Layers,
  listings: ClipboardList,
  applications: ClipboardList,
  apps: ClipboardList,
  visits: Users,
  billing: CreditCard,
  shop: Store,
  providers: Briefcase,
  jobs: Briefcase,
  verify: ShieldCheck,
  inbox: Inbox,
  partners: Users,
  more: MoreHorizontal,
}

function iconFor(link: DeskLink): LucideIcon {
  if (link.icon) return link.icon
  const key = link.label.toLowerCase().split(/\s+/)[0] ?? ""
  return ICON_FALLBACKS[key] ?? Menu
}

function linkActive(pathname: string, href: string) {
  if (pathname === href) return true
  if (href !== "/" && pathname.startsWith(`${href}/`)) {
    // Prefer exact-ish: /landlord should not mark every child if a more specific nav item matches —
    // callers order links specifically; treat prefix as active for section hubs.
    return true
  }
  return false
}

export function DeskShell({
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
  const pathname = usePathname() || "/"
  const drawerId = useId().replace(/:/g, "")
  const primary = useMemo(() => {
    const flagged = links.filter((l) => l.primary)
    const picks = (flagged.length > 0 ? flagged : links).slice(0, 4)
    return picks
  }, [links])

  useEffect(() => {
    document.body.dataset.deskShell = "1"
    return () => {
      delete document.body.dataset.deskShell
    }
  }, [])

  return (
    <div className="desk-shell drawer lg:drawer-open" data-role={role} data-testid="desk-shell">
      <input id={drawerId} type="checkbox" className="drawer-toggle" aria-label="Toggle desk menu" />
      <div className="drawer-content flex min-h-0 flex-col">
        <div className="border-b border-base-300 bg-base-100/90 lg:hidden">
          <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-4 py-3">
            <label
              htmlFor={drawerId}
              className="btn btn-ghost btn-sm btn-square"
              aria-label="Open desk navigation"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </label>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">{kicker}</p>
              <p className="truncate font-serif text-base font-semibold text-primary">{title}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-24 md:px-8 md:py-8 lg:pb-10">
          {children}
        </div>

        <nav
          className="desk-btm-nav btm-nav btm-nav-sm z-40 border-t border-base-300 bg-base-100 text-base-content lg:hidden"
          aria-label="Desk shortcuts"
          data-testid="desk-bottom-nav"
        >
          {primary.map((link) => {
            const Icon = iconFor(link)
            const active = linkActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-ink-soft transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
                  active && "active text-primary",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="btm-nav-label text-[10px] font-semibold uppercase tracking-wide">
                  {link.label}
                </span>
              </Link>
            )
          })}
          <label
            htmlFor={drawerId}
            className="cursor-pointer text-ink-soft transition-colors hover:text-primary"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            <span className="btm-nav-label text-[10px] font-semibold uppercase tracking-wide">More</span>
          </label>
        </nav>
      </div>

      <div className="drawer-side z-50">
        <label htmlFor={drawerId} aria-label="Close desk menu" className="drawer-overlay" />
        <aside className="desk-rail flex min-h-full w-72 flex-col border-r border-base-300 bg-base-100 text-base-content">
          <div className="border-b border-base-300 px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-secondary">{kicker}</p>
            <p className="mt-1 font-serif text-lg font-semibold tracking-tight text-primary">{title}</p>
          </div>
          <nav className="menu menu-md flex-1 gap-0.5 px-2 py-3" aria-label="Desk sections">
            {links.map((link) => {
              const Icon = iconFor(link)
              const active = linkActive(pathname, link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "rounded-sm font-medium transition-colors hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
                      active && "active bg-secondary/10 font-semibold text-secondary",
                    )}
                  >
                    <Icon className="h-4 w-4 opacity-80" aria-hidden />
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </nav>
          <div className="border-t border-base-300 px-4 py-4 text-xs text-ink-soft">
            <div className="mb-3">
              <InstallButton compact />
            </div>
            <Link href="/pricing" className="link link-hover text-secondary">
              Plans &amp; subscribe
            </Link>
            <span className="mx-2 text-base-300">·</span>
            <Link href="/partners" className="link link-hover text-secondary">
              Services network
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
