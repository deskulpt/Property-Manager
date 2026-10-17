import Link from "next/link"
import { Mail, Menu, MessageCircle, Phone } from "lucide-react"
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
import {
  BRAND_CONTACT,
  mailtoHref,
  telHref,
  whatsappHref,
} from "@/lib/brand-contact"
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
  } else if (role === "managing_agent") {
    links.push({ href: "/agent", label: "Managing agent" })
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
      className="text-[13px] font-medium tracking-tight text-ink-soft transition-colors hover:text-brand"
    >
      {link.label}
      {link.badge != null ? <span className="ml-1 text-terra">{link.badge}</span> : null}
    </Link>
  )
}

function UtilityStrip() {
  const wa = whatsappHref(
    BRAND_CONTACT.whatsappE164,
    "Hello Easy Rental — I have a question about industrial leasing.",
  )
  return (
    <div className="border-b border-white/10 bg-brand text-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-1.5 md:px-8">
        {/* Desktop: full numbers + CTAs */}
        <div className="hidden min-w-0 flex-1 items-center gap-x-4 gap-y-1 text-[12px] sm:flex">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/55">
            {BRAND_CONTACT.label}
          </span>
          <a
            href={telHref(BRAND_CONTACT.supportPhoneE164)}
            className="truncate text-paper/90 transition-colors hover:text-paper"
          >
            Support {BRAND_CONTACT.supportPhoneDisplay}
          </a>
          <span className="text-paper/30" aria-hidden>
            ·
          </span>
          <a
            href={telHref(BRAND_CONTACT.salesPhoneE164)}
            className="truncate text-paper/90 transition-colors hover:text-paper"
          >
            Sales {BRAND_CONTACT.salesPhoneDisplay}
          </a>
        </div>

        {/* Mobile: compact icon buttons */}
        <div className="flex flex-1 items-center gap-1 sm:hidden">
          <a
            href={telHref(BRAND_CONTACT.supportPhoneE164)}
            className="inline-flex h-8 w-8 items-center justify-center text-paper/90"
            aria-label={`Call support ${BRAND_CONTACT.supportPhoneDisplay}`}
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center text-paper/90"
            aria-label="WhatsApp Easy Rental"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <a
            href={mailtoHref(BRAND_CONTACT.email)}
            className="inline-flex h-8 w-8 items-center justify-center text-paper/90"
            aria-label={`Email ${BRAND_CONTACT.email}`}
          >
            <Mail className="h-4 w-4" />
          </a>
          <span className="ml-1 truncate font-mono text-[10px] text-paper/55">
            {BRAND_CONTACT.supportPhoneDisplay}
          </span>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-paper/25 bg-paper/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-paper transition-colors hover:bg-paper/20"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            WhatsApp
          </a>
          <a
            href={telHref(BRAND_CONTACT.supportPhoneE164)}
            className="inline-flex items-center gap-1.5 border border-paper/25 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-paper transition-colors hover:bg-paper/10"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Call
          </a>
          <a
            href={mailtoHref(BRAND_CONTACT.email)}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium tracking-wide text-paper/80 transition-colors hover:text-paper"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Email
          </a>
        </div>
      </div>
    </div>
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
    <header className="sticky top-0 z-40 print:hidden">
      <UtilityStrip />
      <div className="border-b border-ink/10 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={140}
              height={48}
              className="h-7 w-auto object-contain md:h-8"
            />
            <span className="sr-only">{t("app.name")}</span>
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
                  className="px-2 py-1.5 text-[13px] font-medium text-ink-soft hover:text-brand"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-brand px-3 py-1.5 text-[13px] font-semibold text-paper hover:bg-brand-deep"
                >
                  Sign up
                </Link>
              </div>
            ) : (
              <form action={logoutSession} className="hidden sm:block">
                <button
                  type="submit"
                  className="px-2 py-1.5 text-[13px] font-medium text-ink-soft hover:text-brand"
                >
                  Log out
                </button>
              </form>
            )}
            <div className="hidden border-l border-ink/10 pl-2 md:block">
              <SessionSwitcher users={users} currentId={currentId} />
            </div>
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-sm border-ink/20 lg:hidden"
                    aria-label="Open menu"
                  />
                }
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="right" className="bg-paper">
                <SheetHeader>
                  <SheetTitle className="font-sans text-base font-semibold tracking-tight">
                    {t("app.name")}
                  </SheetTitle>
                </SheetHeader>
                <div className="grid gap-6 px-4">
                  <div className="grid gap-2 border border-ink/10 bg-paper-2 p-3 text-sm">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      {BRAND_CONTACT.label}
                    </p>
                    <a href={telHref(BRAND_CONTACT.supportPhoneE164)} className="font-medium">
                      Call {BRAND_CONTACT.supportPhoneDisplay}
                    </a>
                    <a
                      href={whatsappHref(BRAND_CONTACT.whatsappE164)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-terra"
                    >
                      WhatsApp
                    </a>
                    <a href={mailtoHref(BRAND_CONTACT.email)} className="font-medium">
                      {BRAND_CONTACT.email}
                    </a>
                  </div>
                  <div>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-terra">
                      Browse
                    </p>
                    <nav className="grid gap-2" aria-label="Mobile browse">
                      {browse.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="text-base font-semibold tracking-tight"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                  <div>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-terra">
                      {role ? `${roleHint} desk` : "Tools"}
                    </p>
                    <nav className="grid gap-2" aria-label="Mobile desk">
                      {desk.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="text-base font-semibold tracking-tight"
                        >
                          {link.label}
                          {link.badge != null ? ` (${link.badge})` : ""}
                        </Link>
                      ))}
                    </nav>
                  </div>
                  <nav className="grid gap-2 border-t border-ink/10 pt-4" aria-label="Account">
                    {visitor ? (
                      <>
                        <Link href="/login" className="text-base font-semibold">
                          Log in
                        </Link>
                        <Link href="/signup" className="text-base font-semibold text-terra">
                          Sign up
                        </Link>
                      </>
                    ) : (
                      <form action={logoutSession}>
                        <button type="submit" className="text-base font-semibold">
                          Log out
                        </button>
                      </form>
                    )}
                    <div className="pt-2 md:hidden">
                      <SessionSwitcher users={users} currentId={currentId} />
                    </div>
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
      </div>
    </header>
  )
}
