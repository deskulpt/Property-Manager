import Link from "next/link"
import { notFound } from "next/navigation"
import { getPlan, PRICING_META } from "@/lib/pricing"
import { BRAND_CONTACT, whatsappHref } from "@/lib/brand-contact"

export const metadata = { title: "Checkout (demo)" }

type Props = { searchParams: Promise<{ plan?: string }> }

export default async function PricingCheckoutPage({ searchParams }: Props) {
  const { plan: planId } = await searchParams
  const plan = getPlan(planId)
  if (!plan || plan.id === "enterprise") notFound()

  const wa = whatsappHref(
    BRAND_CONTACT.whatsappE164,
    `Hello Easy Rental — I'd like the ${plan.name} plan (demo checkout).`,
  )

  return (
    <div className="mx-auto max-w-lg px-4 py-14 md:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Easy Rental" className="h-10 w-auto" width={200} height={44} />
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-terra">
        Demo checkout · no charge
      </p>
      <h1 className="mt-2 font-serif text-3xl font-medium">Confirm {plan.name}</h1>
      <p className="mt-3 text-ink-soft">
        {plan.priceLabel}{" "}
        <span className="font-mono text-xs uppercase tracking-[0.12em]">
          {plan.periodLabel}
        </span>
      </p>
      <p className="mt-2 text-sm text-ink-soft">{plan.tagline}</p>

      <div className="mt-8 border border-ink/15 bg-paper-2 p-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          This is a <strong className="font-semibold text-ink">DEMO</strong> stub. Razorpay
          Subscriptions are not wired. Selecting continue records intent only — you will not be
          charged. Amounts remain <strong className="font-semibold text-ink">proposed</strong>.
        </p>
        <p className="mt-3 text-xs text-ink-soft">{PRICING_META.gstNote}</p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={`/signup?plan=${plan.id}`}
          className="bg-brand px-4 py-2.5 text-center text-sm font-semibold text-paper hover:bg-brand-deep"
        >
          Continue to sign up
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink/20 px-4 py-2.5 text-center text-sm font-semibold text-brand hover:border-terra hover:text-terra"
        >
          Prefer WhatsApp instead
        </a>
        <Link
          href="/pricing"
          className="text-center text-sm font-medium text-terra underline-offset-4 hover:underline"
        >
          ← Back to pricing
        </Link>
      </div>
    </div>
  )
}
