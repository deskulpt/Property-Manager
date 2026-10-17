import Link from "next/link"
import { iconForHref } from "@/components/nav-icons"

export type PortalAccent = "landlord" | "cms" | "console" | "provider" | "default"

export function PortalFrame({
  kicker,
  title,
  links,
  accent = "default",
  children,
}: {
  kicker: string
  title: string
  links: { href: string; label: string }[]
  accent?: PortalAccent
  children: React.ReactNode
}) {
  const chrome =
    accent === "landlord"
      ? "desk-chrome-landlord"
      : accent === "cms"
        ? "desk-chrome-cms"
        : accent === "console"
          ? "desk-chrome-console"
          : accent === "provider"
            ? "desk-chrome-provider"
            : "desk-chrome"
  const tint =
    accent === "landlord"
      ? "section-tint-landlord"
      : accent === "cms"
        ? "section-tint-cms"
        : accent === "console"
          ? "section-tint-console"
          : accent === "provider"
            ? "section-tint-provider"
            : "border-b border-ink/5 bg-[linear-gradient(180deg,rgb(211_222_231/0.45),transparent_180px)]"

  return (
    <div className={accent === "default" ? tint : `border-b border-ink/5 ${tint}`}>
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-8 md:grid-cols-[240px_1fr] md:px-8 md:py-10">
        <aside
          className={`${chrome} bg-card/80 px-4 py-4 md:sticky md:top-24 md:self-start md:px-5 md:py-5`}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">{kicker}</p>
          <p className="mt-1 font-serif text-lg font-semibold tracking-tight">{title}</p>
          <nav
            className="mt-5 flex gap-2 overflow-x-auto md:grid md:gap-0.5"
            aria-label="Section"
          >
            {links.map((link) => {
              const Icon = iconForHref(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex shrink-0 items-center gap-2 border-l-2 border-transparent px-2.5 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:border-terra hover:bg-paper-2 hover:text-ink"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-terra" aria-hidden />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
