import Link from "next/link"

export function PortalFrame({
  kicker,
  title,
  links,
  children,
}: {
  kicker: string
  title: string
  links: { href: string; label: string }[]
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-ink/5 bg-[linear-gradient(180deg,rgb(211_222_231/0.45),transparent_180px)]">
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-8 md:grid-cols-[220px_1fr] md:px-8 md:py-10">
        <aside className="desk-chrome bg-card/80 px-4 py-4 md:sticky md:top-24 md:self-start md:px-5 md:py-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">{kicker}</p>
          <p className="mt-1 font-heading text-lg font-extrabold tracking-tight">{title}</p>
          <nav
            className="mt-5 flex gap-2 overflow-x-auto md:grid md:gap-0.5"
            aria-label="Section"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 border-l-2 border-transparent px-2.5 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:border-terra hover:bg-paper-2 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
