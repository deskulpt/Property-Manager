import Link from "next/link"

export const metadata = { title: "Partners" }

const TRACKS = [
  {
    href: "/partners/affiliate",
    title: "Affiliates",
    body: "Realtors, architects, and contractors who enrol landlords onto Easy Rental SaaS.",
    cta: "Become an affiliate",
  },
  {
    href: "/partners/services",
    title: "Service providers",
    body: "Plumbers, electricians, cleaning, and couriers matched to property catchments.",
    cta: "Join the trade network",
  },
  {
    href: "/partners/refer",
    title: "Refer a partner",
    body: "Know a strong trade or affiliate? Send them into the vetting funnel.",
    cta: "Refer someone",
  },
]

export default function PartnersHubPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-ink/10">
        <div className="blueprint-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Easy Rental" className="h-14 w-auto md:h-16" width={260} height={58} />
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-terra">
            Partner & Service Network
          </p>
          <h1 className="mt-3 max-w-[18ch] font-serif text-3xl font-medium tracking-tight md:text-4xl">
            Work with Easy Rental across India C&I.
          </h1>
          <p className="mt-4 max-w-[48ch] text-lg text-ink-soft">
            Three separate tracks — affiliates, on-demand services, and refer-a-partner. Listing
            referrals stay on Refer & Earn.
          </p>
          <p className="mt-6">
            <Link href="/refer" className="text-sm font-semibold text-terra underline-offset-4 hover:underline">
              Already referring properties? → Refer & Earn
            </Link>
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1200px] gap-4 px-4 py-14 md:grid-cols-3 md:px-8">
        {TRACKS.map((track) => (
          <article key={track.href} className="flex flex-col border border-ink/15 bg-paper-2 p-6">
            <h2 className="font-serif text-2xl font-semibold">{track.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{track.body}</p>
            <Link
              href={track.href}
              className="mt-6 inline-block bg-brand px-4 py-2.5 text-center text-sm font-semibold text-paper hover:bg-brand-deep"
            >
              {track.cta}
            </Link>
          </article>
        ))}
      </section>
      <div className="mx-auto max-w-[1200px] px-4 pb-16 md:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
          <img
            src="/marketing/lifestyle/warehouse-bay.jpg"
            alt="Industrial warehouse bay and yard"
            className="aspect-[21/9] w-full object-cover border border-ink/15 md:aspect-auto md:h-full"
          />
          <img
            src="/marketing/illustrations/leasing-desk.svg"
            alt=""
            className="aspect-[16/9] w-full border border-ink/15 bg-paper object-cover md:aspect-auto md:h-full"
          />
        </div>
      </div>
    </div>
  )
}
