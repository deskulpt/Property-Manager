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
import { t } from "@/lib/i18n"

const links = [
  { href: "/#context", labelKey: "nav.context" as const },
  { href: "/#map", labelKey: "nav.map" as const },
  { href: "/listings", labelKey: "nav.listings" as const },
  { href: "/properties", labelKey: "nav.portfolio" as const },
  { href: "/cms", labelKey: "nav.cms" as const },
  { href: "/landlord", labelKey: "nav.landlord" as const },
  { href: "/provider", labelKey: "nav.providers" as const },
  { href: "/inbox", labelKey: "nav.inbox" as const },
]

export function SiteHeader({
  users,
  currentId,
  unread,
}: {
  users: SwitchUser[]
  currentId: string
  unread: number
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2 font-sans text-lg font-black tracking-tight">
          <span className="inline-block size-3 rotate-45 bg-terra" aria-hidden />
          {t("app.name")}
          <span className="text-terra">.</span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft hover:text-terra"
            >
              {t(link.labelKey)}
              {link.href === "/inbox" && unread > 0 ? (
                <span className="ml-1 text-terra">{unread}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SessionSwitcher users={users} currentId={currentId} />
          <Sheet>
            <SheetTrigger
              render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu" />}
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="bg-paper">
              <SheetHeader>
                <SheetTitle>{t("app.name")}</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-3 px-4" aria-label="Mobile">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} className="font-sans text-lg font-bold">
                    {t(link.labelKey)}
                    {link.href === "/inbox" && unread > 0 ? ` (${unread})` : ""}
                  </Link>
                ))}
                <Link href="/legal/terms" className="text-sm text-ink-soft">{t("nav.legal.terms")}</Link>
                <Link href="/legal/privacy" className="text-sm text-ink-soft">{t("nav.legal.privacy")}</Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
