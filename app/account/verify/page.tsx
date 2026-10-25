import { PageHeader, RoleGate } from "@/components/product"
import { VerificationWizard } from "@/components/verify/wizard"
import { SubmitButton } from "@/components/submit-button"
import { startKycRedirectAction } from "@/lib/kyc/actions"
import { latestVerification, publicFormCountries } from "@/lib/db"
import { t } from "@/lib/i18n"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Verification" }

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ kyc?: string }>
}) {
  const user = await getSessionUser()
  const params = await searchParams
  if (!user || user.role !== "applicant") {
    return (
      <RoleGate
        title="Verification is for applicants"
        body="Sign in as an applicant, or use the Demo switcher (Maya Chen / Devon Hale) when enabled."
      />
    )
  }
  const existing = latestVerification(user.id)
  const countries = publicFormCountries()
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader
        kicker={t("verify.kicker")}
        title={t("verify.title")}
        lede={t("verify.lede")}
      />
      {params.kyc ? (
        <p className="mb-4 border border-brand/20 bg-accent px-4 py-3 text-sm text-brand" role="status">
          KYC provider callback saved. Consent was recorded when you started the redirect.
        </p>
      ) : null}
      <section className="mb-8 border border-ink/10 bg-card p-4">
        <h2 className="font-sans text-lg font-extrabold">Licensed provider redirect</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Starts IDfy / Signzy / HyperVerge (via <code className="font-mono text-xs">KYC_PROVIDER</code>
          ). Test mode returns to an in-app callback. No Aadhaar images stored.
        </p>
        <form action={startKycRedirectAction} className="mt-3">
          <SubmitButton>Start KYC redirect</SubmitButton>
        </form>
      </section>
      <VerificationWizard existing={existing} countries={countries} />
    </div>
  )
}
