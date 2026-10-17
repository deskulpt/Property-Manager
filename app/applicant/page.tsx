import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { PageHeader, StatusBadge } from "@/components/product"
import { applicationsForApplicant, latestVerification } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Applicant" }

export default async function ApplicantHomePage() {
  const user = await getSessionUser()
  if (!user) return null
  const apps = applicationsForApplicant(user.id)
  const verification = latestVerification(user.id)
  const pending = apps.filter((a) => a.status === "submitted").length
  return (
    <div>
      <PageHeader
        kicker="Seeking space"
        title={`${user.name.split(" ")[0]}’s desk`}
        lede="Track applications, finish India ID verify (Aadhaar demo), and complete e-sign packets when landlords send them."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="border border-ink/10 bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Applications</p>
          <p className="font-serif text-2xl font-semibold">{apps.length}</p>
          <p className="text-sm text-ink-soft">{pending} pending</p>
        </div>
        <div className="border border-ink/10 bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">ID verify</p>
          <p className="mt-1">{verification ? <StatusBadge status={verification.result} /> : <span className="text-sm text-ink-soft">Not started</span>}</p>
        </div>
        <div className="border border-ink/10 bg-card p-4 text-sm font-semibold">
          <Link href="/listings" className="text-terra hover:underline">Browse listings</Link>
          <span className="mx-2 text-ink-faint">·</span>
          <Link href="/profile" className="text-terra hover:underline">Profile & OTP</Link>
        </div>
      </div>
      <DoNextFaq
        steps={[
          { title: verification ? "Keep applications moving" : "Complete ID verify", body: verification ? "Watch status on Applications." : "Run the Aadhaar demo — not a live UIDAI check." },
          { title: "Book a visit", body: "Request a site visit from a public bay page when you want a walkthrough." },
          { title: "Watch e-sign", body: "When a landlord sends an agreement, finish the demo e-sign here." },
        ]}
        faqs={[
          { q: "What is Aadhaar demo?", a: "Consent + last-4 / upload stub that stores demo_verified or demo_failed. Never stores full Aadhaar or biometrics." },
          { q: "Where did /account go?", a: "Applicant home moved to /applicant. Legacy /account still lists applications for compatibility." },
        ]}
      />
    </div>
  )
}
