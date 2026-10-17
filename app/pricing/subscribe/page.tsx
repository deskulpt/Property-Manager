import Link from "next/link"
import { notFound } from "next/navigation"
import { listPortfolio } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Subscribe (demo)",
  description:
    "Demo landlord subscribe confirmation with custom domain hosting CTA and portfolio link.",
  path: "/pricing/subscribe",
})

type Props = { searchParams: Promise<{ plan?: string }> }

export default async function PricingSubscribePage({ searchParams }: Props) {
  const { plan } = await searchParams
  const planId = plan === "starter" || plan === "pro" ? plan : null
  if (!planId) notFound()

  const user = await getSessionUser()
  const portfolio = listPortfolio()
  const landlordProperty =
    (user?.tenantId
      ? portfolio.find((p) => p.tenantId === user.tenantId)
      : null) ?? portfolio[0]
  const portfolioHref = landlordProperty
    ? `/properties/${landlordProperty.slug}`
    : "/properties"

  return (
    <div className="mx-auto max-w-lg px-4 py-14 md:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Easy Rental" className="h-10 w-auto" width={200} height={44} />
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-terra">
        Demo subscribe · no charge
      </p>
      <h1 className="mt-2 font-serif text-3xl font-medium">
        You&apos;re on {planId === "pro" ? "Pro" : "Starter"}
      </h1>
      <p className="mt-3 text-ink-soft">
        Intent recorded only — Razorpay subscriptions are not wired. Amounts remain proposed.
      </p>

      <section className="mt-8 border border-terra/30 bg-terra/10 p-5" aria-labelledby="domain-cta">
        <h2 id="domain-cta" className="font-serif text-xl font-semibold">
          Host on your domain
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          {planId === "pro"
            ? "Pro unlocks a custom listings hostname. Add a CNAME in landlord settings, then point prospects at your brand URL."
            : "Upgrade to Pro for a custom listings hostname. Starter keeps the Easy Rental portfolio URL below."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/landlord/settings"
            className="bg-brand px-4 py-2.5 text-center text-sm font-semibold text-paper hover:bg-brand-deep"
          >
            Open domain settings (CNAME)
          </Link>
          <Link
            href={portfolioHref}
            className="border border-ink/20 px-4 py-2.5 text-center text-sm font-semibold text-brand hover:border-terra hover:text-terra"
          >
            Direct portfolio link
            {landlordProperty ? ` · ${landlordProperty.name}` : ""}
          </Link>
        </div>
      </section>

      <p className="mt-8 text-center text-sm">
        <Link href="/pricing" className="text-terra underline-offset-4 hover:underline">
          ← Back to pricing
        </Link>
      </p>
    </div>
  )
}
