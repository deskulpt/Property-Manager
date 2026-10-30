import { completeKycCallbackAction } from "@/lib/kyc/actions"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "KYC callback" }

export default async function KycCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; status?: string; provider?: string }>
}) {
  const user = await getSessionUser()
  const params = await searchParams
  if (!user || user.role !== "applicant") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <PageHeader kicker="KYC" title="Sign in required" lede="Open this link while signed in as an applicant." />
      </div>
    )
  }

  async function confirm() {
    "use server"
    await completeKycCallbackAction({
      session: params.session ?? "",
      status: params.status ?? "approved",
      provider: params.provider,
    })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <PageHeader
        kicker={params.provider ?? "KYC"}
        title="Provider returned"
        lede="Complete the callback to store a provider reference (no Aadhaar images). Consent was recorded when you started."
      />
      <form action={confirm} className="mt-6">
        <SubmitButton>Save verification result</SubmitButton>
      </form>
    </div>
  )
}
