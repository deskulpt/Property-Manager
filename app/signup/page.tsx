import Link from "next/link"
import { redirect } from "next/navigation"
import { SignupForm } from "@/components/auth/signup-form"
import { PageHeader } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Sign up" }

export default async function SignupPage() {
  const session = await getSessionUser()
  if (session?.role === "landlord_admin") redirect("/landlord")

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
      <PageHeader
        kicker="Landlord account"
        title="Create your organisation"
        lede="Self-serve signup for Indian landlords. You land in the landlord desk with a Starter package — no payment processor in this demo."
      />
      <div className="mt-8 border border-ink/10 bg-card p-5 md:p-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Evaluating the OSS demo without an account? Use the{" "}
        <span className="font-semibold text-ink">Demo</span> identity switcher in the header, or{" "}
        <Link href="/login" className="font-semibold text-terra hover:underline">
          log in
        </Link>
        .
      </p>
    </div>
  )
}
