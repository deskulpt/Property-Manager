import Link from "next/link"
import { Building2, Home, ListChecks } from "lucide-react"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">404</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold">That page is not on the plan.</h1>
      <p className="mt-3 text-ink-soft">
        The building, bay, or desk you asked for is not in this demo. Pick a working path below.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 border border-ink/20 bg-card px-4 py-3 text-sm font-semibold text-ink"
        >
          <Home className="h-4 w-4 text-terra" aria-hidden />
          Home
        </Link>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 bg-brand px-4 py-3 text-sm font-semibold text-paper"
        >
          <Building2 className="h-4 w-4" aria-hidden />
          Portfolio
        </Link>
        <Link
          href="/listings"
          className="inline-flex items-center gap-2 border border-ink/20 bg-card px-4 py-3 text-sm font-semibold text-ink"
        >
          <ListChecks className="h-4 w-4 text-terra" aria-hidden />
          Listings
        </Link>
      </div>
    </div>
  )
}
