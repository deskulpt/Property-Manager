import Link from "next/link"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { PageHeader } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Log in" }

export default async function LoginPage() {
  const session = await getSessionUser()
  if (session?.role === "super_admin") redirect("/console")
  if (session?.role === "landlord_admin" && session.hasPassword) redirect("/landlord")
  if (session?.role === "landlord_admin") redirect("/landlord")

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
      <PageHeader
        kicker="Account"
        title="Log in"
        lede="Sign in with your email and password. Platform admins land in the console."
      />
      <div className="mt-8 border border-ink/10 bg-card p-5 md:p-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Need an organisation?{" "}
        <Link href="/signup" className="font-semibold text-terra hover:underline">
          Create an account
        </Link>
        .
      </p>
    </div>
  )
}
