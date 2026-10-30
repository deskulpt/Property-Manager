import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">404</p>
      <h1 className="mt-3 text-3xl font-black">That page is not on the plan.</h1>
      <p className="mt-3 text-ink-soft">The building, bay, or desk you asked for is not in this demo.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-block border border-ink/20 bg-paper px-4 py-3 font-sans text-sm font-bold text-ink">
          Home
        </Link>
        <Link href="/listings" className="inline-block bg-brand px-4 py-3 font-sans text-sm font-bold text-paper">
          Browse listings
        </Link>
        <Link href="/pricing" className="inline-block border border-ink/20 bg-paper px-4 py-3 font-sans text-sm font-bold text-ink">
          Pricing
        </Link>
      </div>
    </div>
  )
}
