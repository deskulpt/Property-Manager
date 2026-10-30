import Link from "next/link"
import { EmptyState, PageHeader, RoleGate } from "@/components/product"
import { InstallButton } from "@/components/pwa-register"
import { SubmitButton } from "@/components/submit-button"
import { markInboxRead } from "@/lib/actions"
import { listNotifications } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Inbox" }

export default async function InboxPage() {
  const user = await getSessionUser()
  if (!user) {
    return (
      <RoleGate
        title="Sign in to open the inbox"
        body="Notices are scoped to your account. Log in, or use L0 SuperAdmin sticky impersonation after signing in as admindeskulpt@gmail.com."
        action={{ href: "/login?next=/inbox", label: "Log in" }}
      />
    )
  }
  const inbox = listNotifications(user.id, "in_app")
  const email = listNotifications(user.id, "email_demo")
  const push = listNotifications(user.id, "push_demo")
  const whatsapp = listNotifications(user.id, "whatsapp_demo")
  const delivery = [...email, ...push, ...whatsapp]
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10">
      <PageHeader
        kicker={user.name}
        title="Inbox"
        lede="In-app notices are the product. Email, web push, and WhatsApp are written by the demo sender beside them — no API key, no device token."
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form action={markInboxRead}>
          <SubmitButton variant="outline" pendingLabel="Marking…">Mark all read</SubmitButton>
        </form>
        <InstallButton />
      </div>
      {inbox.length === 0 ? (
        <EmptyState title="No notices" body="Approvals, jobs, and demo payments land here." />
      ) : (
        <ul className="grid gap-3">
          {inbox.map((note) => (
            <li key={note.id} className="bg-card px-4 py-3 ring-1 ring-foreground/10">
              <p className="font-sans font-bold">{note.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{note.body}</p>
              {note.href ? <Link href={note.href} className="mt-2 inline-block text-sm font-bold text-brand">Open</Link> : null}
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 font-sans text-lg font-extrabold">Demo delivery log</h2>
      <p className="mt-1 text-sm text-ink-soft">These rows are what a mailer, web-push worker, or WhatsApp Business API would have received.</p>
      <ul className="mt-3 grid gap-2">
        {delivery.length === 0 ? (
          <li className="text-sm text-ink-soft">No demo email, push, or WhatsApp has been logged yet.</li>
        ) : (
          delivery.map((note) => (
            <li key={note.id} className="border border-border px-3 py-2 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-wider text-terra">{note.channel}</span>
              <span className="ml-2 font-bold">{note.title}</span>
              <span className="mt-1 block text-ink-soft">{note.body}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
