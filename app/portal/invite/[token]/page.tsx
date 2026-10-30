import { NoticeBanner, PageHeader, RoleGate } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { acceptPortalInvite } from "@/lib/actions"
import { inviteByToken } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Occupant invite" }

export default async function PortalInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const user = await getSessionUser()
  const invite = inviteByToken(token)

  if (!invite) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-12">
        <PageHeader kicker="Invite" title="Link not found" lede="Ask your landlord to resend the occupant portal invite." />
      </div>
    )
  }

  if (!user || user.role !== "applicant") {
    return (
      <RoleGate
        title="Occupant invite"
        body={`Sign in as the applicant invited for Unit ${invite.unitCode} at ${invite.propertyName}, then return to this link.`}
        action={{ href: `/login?next=/portal/invite/${token}`, label: "Log in" }}
      />
    )
  }

  if (user.id !== invite.occupantId) {
    return (
      <RoleGate
        title="Wrong identity"
        body={`This invite is for ${invite.email}. Log in with that account (or impersonate from the L0 sticky bar) and try again.`}
        action={{ href: `/login?next=/portal/invite/${token}`, label: "Log in" }}
      />
    )
  }

  async function accept() {
    "use server"
    await acceptPortalInvite(token)
  }

  return (
    <div className="mx-auto max-w-[640px] px-4 py-12">
      <PageHeader
        kicker={invite.tenantName}
        title={`Open your portal for Unit ${invite.unitCode}.`}
        lede={`${invite.propertyName} is ready. Accepting unlocks dues, tickets, and demo e-sign for this lease.`}
      />
      {invite.acceptedAt ? (
        <NoticeBanner notice="Already accepted — you can open the portal any time." />
      ) : null}
      <form action={accept} className="mt-6">
        <SubmitButton pendingLabel="Opening…">
          {invite.acceptedAt ? "Open occupant portal" : "Accept invite & open portal"}
        </SubmitButton>
      </form>
    </div>
  )
}