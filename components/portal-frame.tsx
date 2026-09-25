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
    <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-8 md:grid-cols-[200px_1fr] md:px-8 md:py-10">
      <aside className="md:sticky md:top-24 md:self-start">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">{kicker}</p>
        <p className="mt-1 font-sans text-lg font-extrabold">{title}</p>
        <nav className="mt-4 flex gap-2 overflow-x-auto md:grid md:gap-1" aria-label="Section">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 border border-transparent px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft hover:border-border hover:bg-card hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
