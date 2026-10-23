import Link from "next/link"

export const metadata = { title: "Careers" }

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-14 md:px-8">
      <h1 className="font-serif text-3xl font-semibold">Careers</h1>
      <p className="mt-4 text-ink-soft">
        No open roles listed in this demo. Partner with us instead — affiliates and service providers
        apply through the Partner Network.
      </p>
      <Link href="/partners" className="mt-6 inline-block text-terra underline">
        Partner hub
      </Link>
    </div>
  )
}
