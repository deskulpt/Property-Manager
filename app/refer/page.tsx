import Link from "next/link"
import { Handshake, Percent, Share2 } from "lucide-react"
import { PageHeader } from "@/components/product"

export const metadata = { title: "Refer & Earn" }

export default function ReferPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-14 md:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Easy Rental" className="h-10 w-auto" width={180} height={40} />
      <PageHeader
        kicker="§19A · Refer & Earn"
        title="Refer industrial listings"
        lede="Earn when you source a landlord organisation or a prospect who publishes and leases through Easy Rental. Partner trade referrals live on the Partner Network."
      />
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {[
          { Icon: Share2, title: "Share a listing lead", body: "Point a landlord org at Sign up or Pricing." },
          { Icon: Percent, title: "Milestone rewards", body: "Publish and lease milestones tracked in console referrals." },
          { Icon: Handshake, title: "Partner path", body: "Trades and affiliates apply via the Partner hub." },
        ].map(({ Icon, title, body }) => (
          <div key={title} className="border border-ink/10 bg-card p-4">
            <Icon className="h-5 w-5 text-terra" aria-hidden />
            <h2 className="mt-3 font-serif text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
        >
          Invite a landlord org
        </Link>
        <Link
          href="/partners/refer"
          className="inline-flex items-center gap-2 border border-ink/25 px-5 py-3 text-sm font-semibold text-ink"
        >
          Refer a trade / affiliate
        </Link>
        <Link
          href="/console/referrals"
          className="inline-flex items-center gap-2 border border-terra/30 px-5 py-3 text-sm font-semibold text-terra"
        >
          Staff: referrals CMS
        </Link>
      </div>
    </div>
  )
}
