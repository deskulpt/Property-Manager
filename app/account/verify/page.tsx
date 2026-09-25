import { PageHeader, RoleGate } from "@/components/product"
import { VerificationWizard } from "@/components/verify/wizard"
import { latestVerification } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Verification" }

export default async function VerifyPage() {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return <RoleGate title="Verification is for applicants" body="Switch to Maya Chen to run the wizard, or Devon Hale to see a completed demo result." />
  }
  const existing = latestVerification(user.id)
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader
        kicker="Identity · demo"
        title="Verify the applicant."
        lede="Pick a country. India uses Aadhaar in this wizard. Other countries use a provincial or state driving licence. The face step is visual and simulated."
      />
      <VerificationWizard existing={existing} />
    </div>
  )
}
