import Link from "next/link"
import { PageHeader } from "@/components/product"
import { CurrencyForm } from "@/components/landlord/currency-form"
import { DomainSettings } from "@/components/landlord/domain-settings"
import { RazorpaySettings } from "@/components/landlord/razorpay-settings"
import { PhoneOtpForm } from "@/components/otp/phone-otp"
import { DataRightsPanel } from "@/components/privacy/data-rights"
import { getShopSettingsPublic, getTenantPackage, listCustomDomains } from "@/lib/db"
import { packageHasCustomDomain, planLabel, subscribeHref } from "@/lib/plans"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord settings" }

export default async function LandlordSettingsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const packageTier = user.tenantPackage ?? getTenantPackage(user.tenantId)
  const domains = listCustomDomains(user.tenantId)
  const shopSettings = getShopSettingsPublic(user.tenantId)
  const hasDomain = packageHasCustomDomain(packageTier)

  return (
    <div>
      <PageHeader
        kicker="Organisation"
        title="Settings"
        lede="Display currency, Razorpay shop keys, phone OTP demo, and Pro custom domains for listings on your own hostname."
      />
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Package</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Current plan:{" "}
          <span className="font-bold tracking-wide text-ink">{planLabel(packageTier)}</span>
          {hasDomain
            ? " — custom domains unlocked."
            : " — upgrade to Pro for a custom listings hostname."}
        </p>
        <Link
          href={subscribeHref(hasDomain ? "pro" : "growth", { from: "settings" })}
          className="mt-4 inline-block text-sm font-semibold text-terra hover:underline"
          data-testid="settings-change-plan"
        >
          Change plan on pricing
        </Link>
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
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Phone OTP (demo)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Country-code picker and E.164 validation. Demo send and verify — no SMS provider.
        </p>
        <div className="mt-4">
          <PhoneOtpForm currentPhone={user.phone} />
        </div>
      </section>
      <DataRightsPanel role={user.role} />
    </div>
  )
}
