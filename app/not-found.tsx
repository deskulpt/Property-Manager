import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">404</p>
      <h1 className="mt-3 text-3xl font-black">That page is not on the plan.</h1>
      <p className="mt-3 text-ink-soft">The building, bay, or desk you asked for is not in this demo.</p>
      <Link href="/properties" className="mt-6 inline-block bg-brand px-4 py-3 font-sans text-sm font-bold text-paper">
        Back to the portfolio
      </Link>
    </div>
  )
}
