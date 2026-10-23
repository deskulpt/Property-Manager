import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { PhoneOtpForm } from "@/components/otp/phone-otp"
import { EmptyState, PageHeader, RoleGate, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { saveProfileNotifPrefs } from "@/lib/actions"
import { latestVerification, listNotifications } from "@/lib/db"
import { getNotifPrefs } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Profile" }

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) {
    return <RoleGate title="Profile" body="Sign in or pick an identity to manage email prefs, WhatsApp OTP, and verification." />
  }
  const prefs = getNotifPrefs(user.id)
  const verification = latestVerification(user.id)
  const inbox = listNotifications(user.id, "in_app")
  const emailLog = listNotifications(user.id, "email_demo")
  const waLog = listNotifications(user.id, "whatsapp_demo")
  const log = [...inbox, ...emailLog, ...waLog]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <PageHeader
        kicker={user.name}
        title="Profile hub"
        lede="Email notification preferences, WhatsApp number with demo OTP, India Aadhaar demo verification, and a notifications centre."
      />

      <section className="mb-8 border border-ink/10 bg-card p-4" data-testid="email-prefs">
        <h2 className="font-serif text-lg font-semibold">Email notification preferences</h2>
        <p className="mt-1 text-sm text-ink-soft">Marketing stays off by default. Delivery is logged as email_demo — no live SMTP.</p>
        <form action={saveProfileNotifPrefs} className="mt-4 grid gap-2 text-sm">
          {(
            [
              ["applications", "Applications", prefs.applications],
              ["visits", "Visits", prefs.visits],
              ["tickets", "Tickets", prefs.tickets],
              ["ledger", "Ledger / dues", prefs.ledger],
              ["shop", "Shop orders", prefs.shop],
              ["marketing", "Marketing", prefs.marketing],
            ] as const
          ).map(([name, label, on]) => (
            <label key={name} className="flex items-center gap-2">
              <input type="checkbox" name={name} defaultChecked={on} className="size-4" />
              <span>{label}</span>
            </label>
          ))}
          <div className="pt-2">
            <SubmitButton pendingLabel="Saving…">Save email prefs</SubmitButton>
          </div>
        </form>
      </section>

      <section className="mb-8 border border-ink/10 bg-card p-4" data-testid="whatsapp-otp">
        <h2 className="font-serif text-lg font-semibold">WhatsApp number + OTP</h2>
        <p className="mt-1 text-sm text-ink-soft">
          E.164 numbers welcome (NRI landlords included). Demo OTP only — no WhatsApp Business API.
        </p>
        <div className="mt-4">
          <PhoneOtpForm currentPhone={user.phone} />
        </div>
      </section>

      <section className="mb-8 border border-ink/10 bg-card p-4" data-testid="aadhaar-demo">
        <h2 className="font-serif text-lg font-semibold">Identity verification (Aadhaar demo)</h2>
        <p className="mt-2 border border-pending/30 bg-pending/10 px-3 py-2 text-sm text-[#8a6312]" role="status">
          Demo verification — not a live UIDAI check. Never stores full Aadhaar or biometrics.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {verification ? (
            <>
              <StatusBadge status={verification.result} />
              <span className="text-ink-soft">
                {verification.docType} · {verification.country} · score {verification.score}
              </span>
            </>
          ) : (
            <span className="text-ink-soft">Not verified yet.</span>
          )}
          <Link href="/account/verify" className="font-semibold text-terra hover:underline">
            Open Aadhaar demo wizard
          </Link>
        </div>
      </section>

      <section className="mb-8" data-testid="notification-log">
        <h2 className="font-serif text-lg font-semibold">Notifications centre</h2>
        <p className="mt-1 text-sm text-ink-soft">
          In-app, email_demo, and whatsapp_demo stubs.{" "}
          <Link href="/inbox" className="font-semibold text-terra hover:underline">Full inbox</Link>
        </p>
        {log.length === 0 ? (
          <EmptyState title="No notices yet" body="OTP, approvals, and dues create log rows here." />
        ) : (
          <ul className="mt-3 grid gap-2">
            {log.map((note) => (
              <li key={note.id} className="border border-ink/10 bg-card px-3 py-2 text-sm">
                <p className="font-semibold">{note.title}</p>
                <p className="text-ink-soft">{note.body}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {note.channel} · {note.createdAt.slice(0, 16).replace("T", " ")}
                </p>
                {note.href ? (
                  <Link href={note.href} className="mt-1 inline-block text-terra hover:underline">
                    Open
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <DoNextFaq
        steps={[
          { title: "Verify WhatsApp with demo OTP", body: "Request code, enter it, confirm on-file number." },
          { title: "Tune email categories", body: "Keep marketing off unless you want product tips." },
          { title: "Run Aadhaar demo if you lease in India", body: "Applicants and providers use the wizard; landlords may skip." },
        ]}
        faqs={[
          { q: "What is the demo OTP?", a: "Fixed demo code 246810 — shown after you request. No SMS is sent." },
          { q: "Do you store full Aadhaar?", a: "No. Only demo result metadata and optional last-4 style stubs in partner flows." },
        ]}
      />
    </div>
  )
}
