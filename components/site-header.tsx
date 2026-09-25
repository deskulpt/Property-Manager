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

const links = [
  { href: "/#context", label: "Context" },
  { href: "/#map", label: "Map" },
  { href: "/listings", label: "Listings" },
  { href: "/properties", label: "Portfolio" },
  { href: "/cms", label: "CMS" },
  { href: "/landlord", label: "Landlord" },
  { href: "/provider", label: "Providers" },
  { href: "/inbox", label: "Inbox" },
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
          DeSkulpt<span className="text-terra">.</span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft hover:text-terra"
            >
              {link.label}
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
                <SheetTitle>DeSkulpt</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-3 px-4" aria-label="Mobile">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} className="font-sans text-lg font-bold">
                    {link.label}
                    {link.href === "/inbox" && unread > 0 ? ` (${unread})` : ""}
                  </Link>
                ))}
                <Link href="/legal/terms" className="text-sm text-ink-soft">Terms</Link>
                <Link href="/legal/privacy" className="text-sm text-ink-soft">Privacy</Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
