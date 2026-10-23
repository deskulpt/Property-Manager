import Link from "next/link"
import { PageHeader } from "@/components/product"
import { ReferSubmitForm } from "@/components/refer/submit-form"
import { getReferrerByUserId } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Submit a property" }

export default async function ReferSubmitPage() {
  const session = await getSessionUser()
  const referrer = session ? getReferrerByUserId(session.id) : null

  return (
    <main className="mx-auto max-w-[800px] px-4 py-10 md:px-8">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
        <Link href="/refer" className="hover:text-terra">
          Refer & Earn
        </Link>{" "}
        / Submit
      </p>
      <PageHeader
        kicker="Path A"
        title="Submit a C&I property"
        lede="Share the address and landlord contact. Owner consent is required. We never scrape MagicBricks or 99acres for you."
      />
      <ReferSubmitForm
        defaults={{
          referrerName: referrer?.name ?? session?.name,
          referrerPhone: referrer?.phone ?? session?.phone ?? undefined,
          referrerEmail: referrer?.email ?? session?.email,
        }}
      />
    </main>
  )
}
