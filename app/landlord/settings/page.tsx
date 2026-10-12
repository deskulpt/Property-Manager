import { PageHeader } from "@/components/product"
import { CurrencyForm } from "@/components/landlord/currency-form"
import { PhoneOtpForm } from "@/components/otp/phone-otp"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord settings" }

export default async function LandlordSettingsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null

  return (
    <div>
      <PageHeader
        kicker="Organisation"
        title="Display currency and phone"
        lede="NRI landlords can view books in USD, CAD, or GBP. Charges, GST, UPI, and eNACH stay in INR. OTP accepts any E.164 number — not only +91."
      />
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
