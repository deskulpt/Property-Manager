import Link from "next/link"
import {
  cancelSubscriptionAction,
  confirmDemoCheckoutAction,
  startCheckoutAction,
} from "@/lib/billing/actions"
import {
  SEGMENT_LABEL,
  formatInrPaise,
  quotePlatformBilling,
  type BillableSegment,
} from "@/lib/billing/pricing"
import {
  countPayingBillingAccounts,
  getActiveBillingSubscription,
  listBillingSubscriptions,
} from "@/lib/billing/store"
import { billingProviderName } from "@/lib/billing"
import { countUnits } from "@/lib/db"
import { SubmitButton } from "@/components/submit-button"

const SEGMENTS: BillableSegment[] = ["homes", "retail_office", "industrial"]

export function BillingDesk({
  tenantId,
  notice,
}: {
  tenantId: string
  notice?: string | null
}) {
  const active = getActiveBillingSubscription(tenantId)
  const history = listBillingSubscriptions(tenantId)
  const units = countUnits(tenantId)
  const provider = billingProviderName()
  const preview = quotePlatformBilling({
    mix: [{ segment: "homes", count: Math.max(1, units) }],
    cadence: "monthly",
    payingAccountCount: countPayingBillingAccounts(),
  })

  return (
    <div className="grid gap-8">
      {notice ? (
        <p className="border border-brand/20 bg-accent px-4 py-3 text-sm text-brand" role="status">
          {notice}
        </p>
      ) : null}

      <section className="bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Current plan</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Provider: <span className="font-mono text-ink">{provider}</span> (swap with{" "}
          <code className="font-mono text-xs">BILLING_PROVIDER</code>). Units in portfolio:{" "}
          <strong>{units}</strong>
          {!active ? " · Free plan limit = 1 unit" : null}
        </p>
        {active ? (
          <div className="mt-4 space-y-2 text-sm">
            <p>
              Status: <strong className="uppercase">{active.status}</strong> · {active.cadence}
            </p>
            <p>
              Price lock until:{" "}
              <span className="font-mono text-xs">{active.priceLockUntil ?? "—"}</span>
            </p>
            <form action={cancelSubscriptionAction}>
              <SubmitButton className="mt-2">Cancel subscription</SubmitButton>
            </form>
            <p className="text-xs text-ink-faint">
              Cancel is one click — same effort as signing up. You return to Free (1 unit).
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">
            You are on Free. Example quote for {Math.max(1, units)} Homes unit(s):{" "}
            <strong>{formatInrPaise(preview.totalInclusivePaise)}</strong> incl. GST (
            {preview.pricingPath}).
          </p>
        )}
      </section>

      {!active ? (
        <section className="bg-card p-4 ring-1 ring-foreground/10 md:p-6">
          <h2 className="font-sans text-lg font-extrabold">Checkout (test mode)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            No live keys — adapters open an in-app confirm step. India payers use{" "}
            <code className="font-mono text-xs">BILLING_PROVIDER</code> (Dodo/Stripe). Outside India,
            PayPal sandbox (Deskulpt Inc CA) via <code className="font-mono text-xs">BILLING_INTL_PROVIDER</code>
            — INR total converted to CAD/USD. Sale vs volume: better discount wins (never stacked).
          </p>
          <form action={startCheckoutAction} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Billing country</span>
              <select
                name="billing_country"
                className="h-10 border border-ink/20 bg-paper px-3"
                defaultValue="IN"
              >
                <option value="IN">India (Dodo / primary MoR)</option>
                <option value="CA">Canada (PayPal — CAD)</option>
                <option value="US">United States (PayPal — USD/CAD)</option>
                <option value="GB">United Kingdom (PayPal)</option>
                <option value="AE">UAE (PayPal)</option>
                <option value="SG">Singapore (PayPal)</option>
                <option value="AU">Australia (PayPal)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Cadence</span>
              <select
                name="cadence"
                className="h-10 border border-ink/20 bg-paper px-3"
                defaultValue="monthly"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual (10× monthly)</option>
              </select>
            </label>
            {SEGMENTS.map((segment) => (
              <label key={segment} className="grid gap-1 text-sm">
                <span className="font-medium">{SEGMENT_LABEL[segment]} units</span>
                <input
                  name={`units_${segment}`}
                  type="number"
                  min={0}
                  defaultValue={segment === "homes" ? Math.max(1, units) : 0}
                  className="h-10 border border-ink/20 bg-paper px-3"
                />
              </label>
            ))}
            <SubmitButton>Continue to checkout</SubmitButton>
          </form>
        </section>
      ) : null}

      <section className="bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No subscription rows yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm">
            {history.map((row) => (
              <li key={row.id} className="border border-ink/10 px-3 py-2 font-mono text-xs">
                {row.status} · {row.provider} · {row.cadence} · {row.createdAt.slice(0, 10)}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm">
          <Link href="/pricing" className="font-semibold text-terra hover:underline">
            Public pricing
          </Link>
        </p>
      </section>
    </div>
  )
}

export function ConfirmCheckoutForm({
  session,
  refId,
}: {
  session: string
  refId: string
}) {
  return (
    <form action={confirmDemoCheckoutAction} className="mt-6 grid gap-3">
      <input type="hidden" name="session" value={session} />
      <input type="hidden" name="ref" value={refId} />
      <p className="text-sm text-ink-soft">
        Test-mode confirm for session <span className="font-mono text-xs">{session}</span>. This
        activates the subscription without contacting a live processor.
      </p>
      <SubmitButton>Confirm test payment</SubmitButton>
    </form>
  )
}
