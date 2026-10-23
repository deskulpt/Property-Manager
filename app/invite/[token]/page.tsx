import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { SubmitButton } from "@/components/submit-button"
import { acceptInviteAction } from "@/lib/actions"
import { getInviteByToken } from "@/lib/db"
import { seatRoleLabel } from "@/lib/auth/seats"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Accept invite" }

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const { error } = await searchParams
  const invite = getInviteByToken(token)
  const session = await getSessionUser()

  if (!invite) {
    return (
      <AuthShell title="Invite not found" lede="This link is invalid or was already cleaned up.">
        <Link href="/" className="font-semibold text-terra hover:underline">
          Go home
        </Link>
      </AuthShell>
    )
  }

  if (invite.acceptedAt) {
    return (
      <AuthShell
        title="Invite already accepted"
        lede={`${invite.tenantName} · ${seatRoleLabel(invite.seatRole)}`}
      >
        <Link href="/landlord" className="font-semibold text-terra hover:underline">
          Open landlord desk
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={`Join ${invite.tenantName}`}
      lede={`You were invited as ${seatRoleLabel(invite.seatRole)}. Sign in as ${invite.email} to accept.`}
      footer={
        !session ? (
          <>
            <Link
              href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
              className="font-semibold text-terra hover:underline"
            >
              Log in
            </Link>
            <span className="mx-2 text-ink-faint">·</span>
            <Link href="/signup" className="font-semibold text-terra hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>Signed in as {session.email}</>
        )
      }
    >
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {session ? (
        <form
          action={async () => {
            "use server"
            await acceptInviteAction(token)
          }}
        >
          <SubmitButton pendingLabel="Joining…">Accept invite</SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-ink-soft">Log in with the invited email, then return to this page.</p>
      )}
    </AuthShell>
  )
}
