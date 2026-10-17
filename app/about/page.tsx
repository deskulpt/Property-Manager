import Link from "next/link"
import { JsonLd } from "@/components/seo/json-ld"
import { buildMetadata, organizationJsonLd } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "About",
  description:
    "Easy Rental by DeSkulpt Inc. — India C&I leasing desk with direct apply, maps, and landlord ops.",
  path: "/about",
})

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-14 md:px-8">
      <JsonLd data={organizationJsonLd()} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Easy Rental" className="h-12 w-auto" width={220} height={50} />
      <h1 className="mt-8 font-serif text-3xl font-semibold">About Easy Rental</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Easy Rental is the industrial leasing desk from DeSkulpt Inc. — warehouses, yards, and parks
        across India, with landlord books, applications, and on-demand trades in one product.
      </p>
      <section id="markets" className="mt-12 scroll-mt-24">
        <h2 className="font-serif text-2xl font-semibold">Markets (India)</h2>
        <p className="mt-3 text-ink-soft">
          Demo inventory spans Mumbai / Bhiwandi / Powai, Pune Hinjewadi, Bengaluru Whitefield, and
          Chennai Sriperumbudur corridors. More city pages ship when inventory supports them.
        </p>
      </section>
      <section id="trust" className="mt-12 scroll-mt-24">
        <h2 className="font-serif text-2xl font-semibold">Trust & safety</h2>
        <p className="mt-3 text-ink-soft">
          Partner identity checks (PAN / Aadhaar) are <strong>demo simulations</strong> in this build —
          not live UIDAI or NSDL verification. We do not invent CRECI/RERA seals.
        </p>
      </section>
      <p className="mt-12">
        <Link href="/partners" className="text-terra underline">
          Work with us → Partners
        </Link>
      </p>
    </div>
  )
}
