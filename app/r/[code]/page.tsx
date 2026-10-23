import { redirect } from "next/navigation"
import { captureReferralCode } from "@/lib/actions"

export default async function ReferralCodeLanding({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const result = await captureReferralCode(code)
  if (!result.ok) {
    redirect("/refer?error=unknown_code")
  }
  redirect(`/signup?ref=${encodeURIComponent(result.code)}`)
}
