"use client"

import { useActionState } from "react"
import Link from "next/link"
import {
  activateSubscriptionPlan,
  type SubscribeFormState,
} from "@/lib/actions"
import { SubmitButton } from "@/components/submit-button"
import {
  isSelfServePlan,
  planLabel,
  planLimits,
  PUBLIC_PLANS,
  type PlanId,
} from "@/lib/plans"

const initial: SubscribeFormState = { error: null, fieldErrors: {} }

export function SubscribeForm({
  plan,
  seatsDefault = 1,
  from,
}: {
  plan: PlanId
  seatsDefault?: number
  from?: string | null
}) {
  const [state, action] = useActionState(activateSubscriptionPlan, initial)
  const card = PUBLIC_PLANS.find((p) => p.id === plan)
  const limits = planLimits(plan)
  const selfServe = isSelfServePlan(plan)

  if (!selfServe) {
    return (
      <div className="border border-ink/15 bg-card p-6" data-testid="subscribe-enterprise">
        <h2 className="font-serif text-2xl font-semibold">Enterprise</h2>
        <p className="mt-3 text-ink-soft">
          Volume seats and white-label options are sales-led. Email{" "}
          <a className="font-semibold text-terra hover:underline" href="mailto:hello@easyrental.space">
            hello@easyrental.space
          </a>{" "}
          or pick a self-serve plan.
        </p>
        <Link
          href="/pricing#plans"
          className="mt-6 inline-block bg-brand px-4 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
        >
          Back to listing plans
        </Link>
        <Link
          href="/pricing#platform-billing"
          className="mt-3 inline-block text-sm font-semibold text-terra hover:underline"
        >
          Or see per-unit platform billing
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="border border-ink/15 bg-card p-5 md:p-6" data-testid="subscribe-form">
      <input type="hidden" name="plan" value={plan} />
      {from ? <input type="hidden" name="from" value={from} /> : null}

      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
        {from === "onboard" ? "L2 landlord onboard · step: subscribe" : "Demo purchase"}
      </p>
      <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">{planLabel(plan)}</h2>
      {card ? (
        <p className="mt-2 text-ink-soft">
          <span className="font-serif text-3xl font-semibold text-brand">{card.priceLabel}</span>
          <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            / active listed property / year · proposed · excl. GST
          </span>
        </p>
      ) : null}
      <p className="mt-4 text-sm text-ink-soft">{card?.blurb}</p>

      <ul className="mt-5 space-y-2 text-sm text-ink">
        <li>
          Org seats soft cap: <strong>{limits.maxSeats}</strong>
        </li>
        <li>
          Units soft cap / property: <strong>{limits.maxUnitsPerProperty}</strong>
        </li>
        <li>
          Custom domain: <strong>{limits.customDomain ? "Yes" : "Upgrade to Pro"}</strong>
        </li>
        <li>
          Ask Easy: <strong>{limits.askEasy ? "Yes" : "Upgrade / stub"}</strong>
        </li>
      </ul>

      {(plan === "growth" || plan === "pro") && (
        <label className="mt-6 block text-sm">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            Listing seats to activate
          </span>
          <input
            type="number"
            name="seats"
            min={1}
            max={limits.maxProperties}
            defaultValue={Math.min(Math.max(1, seatsDefault), limits.maxProperties)}
            className="mt-1 w-full border border-ink/20 bg-paper px-3 py-2 font-mono text-sm"
            data-testid="subscribe-seats"
          />
          <span className="mt-1 block text-xs text-ink-faint">
            Demo path records seats in the welcome notice; live Razorpay metering comes later.
          </span>
        </label>
      )}

      {state.error ? (
        <p className="mt-4 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <p className="mt-6 text-xs text-ink-faint">
        No card charge in this slice — activating sets your organisation package so the landlord desk
        unlocks the right feature gates. Billing stays illustrative until commercial sign-off.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton className="bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-deep">
          Activate {planLabel(plan)} (demo)
        </SubmitButton>
        <Link
          href="/pricing#plans"
          className="border border-ink/25 px-5 py-3 text-sm font-semibold text-ink hover:border-terra hover:text-terra"
        >
          Change plan
        </Link>
      </div>
    </form>
  )
}
