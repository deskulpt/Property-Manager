import Link from "next/link"
import { PageHeader, RoleGate } from "@/components/product"
import { ensureReferrerForUser, getReferrerByUserId } from "@/lib/db"
import { referralLinkPath } from "@/lib/referrals"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Referral link" }

export default async function ReferLinkPage() {
  const session = await getSessionUser()
  if (!session) {
    return (
      <RoleGate
        title="Pick a demo identity"
        body="Switch to Asha Reddy · Refer & Earn in the header to copy your personal link, or any identity to mint a demo code."
      />
    )
  }

  const referrer =
    session.role === "referrer"
      ? (getReferrerByUserId(session.id) ?? ensureReferrerForUser(session))
      : ensureReferrerForUser(session)
  const path = referralLinkPath(referrer.code)
  const absoluteHint = `https://easyrental.space${path}`

  return (
    <main className="mx-auto max-w-[800px] px-4 py-10 md:px-8">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
        <Link href="/refer" className="hover:text-terra">
          Refer & Earn
        </Link>{" "}
        / Link
      </p>
      <PageHeader
        kicker="Path B"
        title="Your personal referral link"
        lede="Send this to a landlord. When they open it, attribution is locked for 90 days to Published. Owner package credit is proposed FAQ copy only — not automated yet."
      />

      <div className="border border-ink/10 bg-card p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Code</p>
        <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight">{referrer.code}</p>
        <p className="mt-4 break-all font-mono text-sm text-ink-soft">{path}</p>
        <p className="mt-1 break-all font-mono text-xs text-ink-faint">{absoluteHint}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={path}
            className="inline-flex h-9 items-center bg-brand px-4 font-heading text-sm font-bold text-paper"
          >
            Open link
          </Link>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `List your C&I property on Easy Rental with my referral: ${absoluteHint}`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center border border-ink/20 px-4 font-heading text-sm font-bold"
          >
            Share on WhatsApp
          </a>
          <Link href="/refer/dashboard" className="inline-flex h-9 items-center px-2 font-heading text-sm font-bold text-terra underline">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
