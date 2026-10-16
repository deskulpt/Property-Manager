import { redirect } from "next/navigation"
import { getReferrerByCode } from "@/lib/db"
import { isValidRefCode, normalizeRefCode } from "@/lib/referrals"

export const metadata = { title: "Referral" }

export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: raw } = await params
  if (!isValidRefCode(raw)) redirect("/signup")
  const code = normalizeRefCode(raw)
  const referrer = getReferrerByCode(code)
  if (!referrer) redirect("/signup")
  redirect(`/signup?ref=${encodeURIComponent(code)}`)
}
