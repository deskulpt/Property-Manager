import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { CreateAccountForm } from "@/components/auth/create-account-form"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Create account" }

export default async function CreateAccountPage() {
  const session = await getSessionUser()
  if (!session) redirect("/signup")
  if (session.role === "landlord_admin" && session.tenantId) redirect("/landlord")

  return (
    <AuthShell
      title="Create your landlord account"
      lede="India-only organisation onboarding. You land on an empty landlord desk — no Nadia, Jonah, or other seeded identity."
      footer={
        <>
          Signed in as {session.email}.{" "}
          <Link href="/login" className="font-semibold text-terra hover:underline">
            Use a different account
          </Link>
        </>
      }
    >
      <CreateAccountForm
        defaults={{ contactName: session.name, contactEmail: session.email }}
      />
    </AuthShell>
  )
}
