import Link from "next/link"
import { ExternalLink, Globe, Package } from "lucide-react"
import { PageHeader } from "@/components/product"
import { CurrencyForm } from "@/components/landlord/currency-form"
import { DomainSettings } from "@/components/landlord/domain-settings"
import { RazorpaySettings } from "@/components/landlord/razorpay-settings"
import { PhoneOtpForm } from "@/components/otp/phone-otp"
import { getShopSettingsPublic, getTenantPackage, listCustomDomains } from "@/lib/db"
import { publicOriginForTenant } from "@/lib/listing-url"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord settings" }

export default async function LandlordSettingsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const packageTier = user.tenantPackage ?? getTenantPackage(user.tenantId)
  const domains = listCustomDomains(user.tenantId)
  const shopSettings = getShopSettingsPublic(user.tenantId)
  const origin = await publicOriginForTenant(user.tenantId)

  return (
    <div>
      <PageHeader
        kicker="Landlord organisation"
        title="Settings"
        lede="Hosted listings link, PRO custom domains, display currency, Razorpay shop keys, and phone OTP demo."
      />
      <section className="mb-10 border border-terra/25 bg-accent/50 p-4 md:p-6">
        <h2 className="flex items-center gap-2 font-sans text-lg font-extrabold">
          <Globe className="h-5 w-5 text-terra" aria-hidden />
          Your hosted listings link
        </h2>
        <p className="mt-2 break-all font-mono text-sm font-semibold text-brand">
          {origin}/properties
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Share this URL with prospects after you subscribe. Occupants and applicants use public
          listing pages — they are not landlord organisations.
        </p>
        <a
          href={`${origin}/properties`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-terra hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Open hosted portfolio
        </a>
      </section>
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="flex items-center gap-2 font-sans text-lg font-extrabold">
          <Package className="h-5 w-5 text-terra" aria-hidden />
          Package
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Current plan:{" "}
          <span className="font-bold uppercase tracking-wide text-ink">{packageTier}</span>
          {packageTier === "pro"
            ? " — custom domains unlocked below."
            : " — upgrade to PRO for a custom listings hostname."}
        </p>
        {packageTier !== "pro" ? (
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-terra hover:underline"
          >
            View landlord plans
          </Link>
        ) : null}
      </section>
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <DomainSettings packageTier={packageTier} domains={domains} />
      </section>
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <RazorpaySettings settings={shopSettings} />
      </section>
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Display currency</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Current preference: <span className="font-bold text-ink">{user.displayCurrency}</span>. When it is not INR, the ledger shows the converted figure and the INR charge.
        </p>
        <div className="mt-4">
          <CurrencyForm current={user.displayCurrency} />
        </div>
      </section>
      <section className="bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Phone OTP (demo)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Country-code picker and E.164 validation. Demo send and verify — no SMS provider.
        </p>
        <div className="mt-4">
          <PhoneOtpForm currentPhone={user.phone} />
        </div>
      </section>
    </div>
  )
}
