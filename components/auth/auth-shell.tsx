import Link from "next/link"

export function AuthShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string
  lede: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="relative isolate overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,110,140,0.12),_transparent_55%),linear-gradient(180deg,#eef2f5_0%,#e4ebf0_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(19,37,58,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(19,37,58,0.06)_1px,transparent_1px)] [background-size:28px_28px]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[70vh] max-w-[480px] flex-col justify-center px-4 py-16 md:px-8">
        <p className="font-heading text-3xl font-extrabold tracking-tight text-brand">
          Easy Rental
          <span className="text-terra">.</span>
        </p>
        <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{lede}</p>
        <div className="mt-8 rounded-sm border border-ink/10 bg-card/90 p-5 shadow-[0_1px_0_rgba(19,37,58,0.04)] md:p-6">
          {children}
        </div>
        {footer ? <div className="mt-6 text-sm text-ink-soft">{footer}</div> : null}
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          <Link href="/" className="hover:text-terra">
            ← Back to Easy Rental
          </Link>
        </p>
      </div>
    </main>
  )
}
