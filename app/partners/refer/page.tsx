import { PartnerReferForm } from "@/components/partners/apply-forms"

export const metadata = { title: "Refer a partner" }

export default async function PartnerReferPage({
  searchParams,
}: {
  searchParams: Promise<{ thanks?: string }>
}) {
  const sp = await searchParams
  return (
    <div className="mx-auto max-w-[800px] px-4 py-12 md:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Easy Rental" className="h-10 w-auto" width={180} height={40} />
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-terra">Refer a partner</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Introduce a trade or affiliate</h1>
      <p className="mt-3 max-w-[50ch] text-ink-soft">
        Staff may invite the referred person to the right apply form. This is not Refer & Earn property
        sourcing.
      </p>
      {sp.thanks ? (
        <p className="mt-6 border border-avail/30 bg-avail/10 px-4 py-3 text-sm text-ink">
          Thanks — referral {sp.thanks} is in the queue as <strong>new</strong>.
        </p>
      ) : null}
      <div className="mt-8">
        <PartnerReferForm />
      </div>
    </div>
  )
}
