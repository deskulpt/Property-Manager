import { PageHeader, RoleGate } from "@/components/product"
import { VerificationWizard } from "@/components/verify/wizard"
import { latestVerification, publicFormCountries } from "@/lib/db"
import { t } from "@/lib/i18n"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Verification" }

export default async function VerifyPage() {
  const user = await getSessionUser()
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
      <VerificationWizard existing={existing} countries={countries} />
    </div>
  )
}
