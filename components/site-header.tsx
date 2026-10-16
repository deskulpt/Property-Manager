import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SessionSwitcher, type SwitchUser } from "@/components/session-switcher"
import { logoutSession } from "@/lib/actions"
import { isStaffRole, roleLabel, type Role } from "@/lib/format"
import { t } from "@/lib/i18n"

type NavLink = { href: string; label: string; badge?: number }

function publicLinks(): NavLink[] {
  return [
    { href: "/listings", label: t("nav.listings") },
    { href: "/#map", label: t("nav.map") },
    { href: "/properties", label: t("nav.portfolio") },
  ]
}

/** Role-clear desk — only the active identity's workspace, never every portal at once. */
function deskLinks(role: Role | null | undefined, unread: number): NavLink[] {
  const links: NavLink[] = []
  if (role === "landlord_admin") {
    links.push({ href: "/landlord", label: t("nav.desk.landlord") })
  } else if (role === "applicant") {
    links.push({ href: "/account", label: t("nav.desk.applicant") })
    links.push({ href: "/shop", label: "Shop" })
  } else if (role === "service_provider") {
    links.push({ href: "/provider", label: t("nav.desk.provider") })
  } else if (role && isStaffRole(role)) {
    links.push({ href: "/cms", label: t("nav.desk.cms") })
  }
  links.push({
    href: "/inbox",
    label: t("nav.inbox"),
    badge: unread > 0 ? unread : undefined,
  })
  return links
}

function NavItem({ link }: { link: NavLink }) {
  return (
    <Link
      href={link.href}
      className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-terra"
    >
      {link.label}
      {link.badge != null ? <span className="ml-1 text-terra">{link.badge}</span> : null}
    </Link>
  )
}

export function SiteHeader({
  users,
  currentId,
  unread,
  role,
  signedIn,
}: {
  users: SwitchUser[]
  currentId: string
  unread: number
  role?: Role | null
  signedIn?: boolean
}) {
  const browse = publicLinks()
  const desk = deskLinks(role, unread)
  const roleHint = role ? roleLabel(role) : "Visitor"
  const visitor = !signedIn

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="group flex items-baseline gap-0 font-serif text-lg font-semibold tracking-tight text-brand md:text-xl"
        >
          <span className="relative">
            {t("app.name")}
            <span
              className="absolute -bottom-0.5 left-0 h-[2px] w-full bg-terra"
              aria-hidden
            />
          </span>
          <span className="text-terra">.</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          <div className="flex items-center gap-5 pr-4">
            {browse.map((link) => (
              <NavItem key={link.href} link={link} />
            ))}
          </div>
          <div
            className="flex items-center gap-5 border-l border-ink/15 pl-4"
            aria-label={role ? `${roleHint} desk` : "Visitor tools"}
          >
            {desk.map((link) => (
              <NavItem key={link.href} link={link} />
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          {visitor ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft hover:text-terra"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-terra px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] font-bold text-white hover:bg-terra-dark"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <form action={logoutSession} className="hidden sm:block">
              <button
                type="submit"
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft hover:text-terra"
              >
                Log out
              </button>
            </form>
          )}
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint xl:block">
            {roleHint}
          </p>
          <SessionSwitcher users={users} currentId={currentId} />
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-sm border-ink/20 lg:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="bg-paper">
              <SheetHeader>
                <SheetTitle className="font-heading">{t("app.name")}</SheetTitle>
              </SheetHeader>
              <div className="grid gap-6 px-4">
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-terra">
                    Browse
                  </p>
                  <nav className="grid gap-2" aria-label="Mobile browse">
                    {browse.map((link) => (
                      <Link key={link.href} href={link.href} className="font-serif text-lg font-bold">
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-terra">
                    {role ? `${roleHint} desk` : "Tools"}
                  </p>
                  <nav className="grid gap-2" aria-label="Mobile desk">
                    {desk.map((link) => (
                      <Link key={link.href} href={link.href} className="font-serif text-lg font-bold">
                        {link.label}
                        {link.badge != null ? ` (${link.badge})` : ""}
                      </Link>
                    ))}
                  </nav>
                </div>
                <nav className="grid gap-2 border-t border-ink/10 pt-4" aria-label="Account">
                  {visitor ? (
                    <>
                      <Link href="/login" className="font-serif text-lg font-bold">
                        Log in
                      </Link>
                      <Link href="/signup" className="font-serif text-lg font-bold text-terra">
                        Sign up
                      </Link>
                    </>
                  ) : (
                    <form action={logoutSession}>
                      <button type="submit" className="font-serif text-lg font-bold">
                        Log out
                      </button>
                    </form>
                  )}
                  <Link href="/legal/terms" className="text-sm text-ink-soft">
                    {t("nav.legal.terms")}
                  </Link>
                  <Link href="/legal/privacy" className="text-sm text-ink-soft">
                    {t("nav.legal.privacy")}
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
