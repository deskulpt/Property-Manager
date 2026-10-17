import Link from "next/link"

export const metadata = { title: "Refer & Earn" }

/** Stub until Slice J Refer & Earn lands on main — keeps footer / partner cross-links alive. */
export default function ReferStubPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-14 md:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Easy Rental" className="h-10 w-auto" width={180} height={40} />
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-terra">§19A · Refer & Earn</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Refer industrial listings</h1>
      <p className="mt-4 text-ink-soft">
        Property-sourcing referrals (publish + lease milestones) ship on the Refer & Earn branch.
        This stub keeps navigation distinct from the Partner & Service Network.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/partners"
          className="bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
        >
          Partner network instead
        </Link>
        <Link
          href="/partners/refer"
          className="border border-ink/25 px-5 py-3 text-sm font-semibold text-ink"
        >
          Refer a trade / affiliate
        </Link>
      </div>
    </div>
  )
}
