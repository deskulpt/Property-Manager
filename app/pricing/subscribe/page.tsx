import Link from "next/link"
import { redirect } from "next/navigation"
import { SubscribeForm } from "@/components/pricing/subscribe-form"
import { PageHeader } from "@/components/product"
import { parsePlanId, PUBLIC_PLANS, type PlanId } from "@/lib/plans"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Choose a plan" }

type Search = { plan?: string; seats?: string; from?: string }

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const params = await searchParams
  const plan = parsePlanId(params.plan)
  const seatsRaw = Number(params.seats ?? "1")
  const seatsDefault = Number.isFinite(seatsRaw) && seatsRaw > 0 ? Math.floor(seatsRaw) : 1
  const from = params.from ?? null

  const session = await getSessionUser()
  if (!session) {
    const next = `/pricing/subscribe?plan=${plan}${from ? `&from=${encodeURIComponent(from)}` : ""}`
    redirect(`/signup?next=${encodeURIComponent(next)}`)
  }
  if (session.role !== "landlord_admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
        <PageHeader
          kicker="Subscription"
          title="Landlord plans only"
          lede="Listing packages are for landlord organisations (L2). Switch identity or sign up as a landlord to continue."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="bg-brand px-4 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
          >
            Landlord sign up
          </Link>
          <Link
            href="/pricing"
            className="border border-ink/25 px-4 py-3 text-sm font-semibold text-ink hover:border-terra"
          >
            Back to pricing
          </Link>
        </div>
      </div>
    )
  }

  const labels = PUBLIC_PLANS.map((p) => p.label).join(" · ")

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8" data-testid="subscribe-page">
      <PageHeader
        kicker={from === "onboard" ? "Onboard · subscribe" : "Activate plan"}
        title="Purchase your listing plan"
        lede={`Choose ${labels}. Meter is per active listed property for 12 months. Demo path — no live charge yet.`}
      />
      <PlanPicker current={plan} from={from} />
      <div className="mt-6">
        <SubscribeForm plan={plan} seatsDefault={seatsDefault} from={from} />
      </div>
    </div>
  )
}

function PlanPicker({ current, from }: { current: PlanId; from: string | null }) {
  const selfServe = PUBLIC_PLANS.filter((p) => p.id !== "enterprise")
  return (
    <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Plan">
      {selfServe.map((p) => {
        const href = `/pricing/subscribe?plan=${p.id}${from ? `&from=${encodeURIComponent(from)}` : ""}`
        const active = p.id === current
        return (
          <Link
            key={p.id}
            href={href}
            role="tab"
            aria-selected={active}
            className={[
              "border px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-terra bg-terra/10 text-terra"
                : "border-ink/20 text-ink-soft hover:border-terra hover:text-terra",
            ].join(" ")}
            data-testid={`subscribe-pick-${p.id}`}
          >
            {p.label} · {p.priceLabel}
          </Link>
        )
      })}
    </div>
  )
}
