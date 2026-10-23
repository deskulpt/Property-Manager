import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { QrPoster } from "@/components/landlord/qr-poster"
import { PageHeader } from "@/components/product"
import { buildPropertyPoster, qrDataUrl } from "@/lib/poster"
import { absolutePublicUrl } from "@/lib/poster-shared"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Property QR poster" }

export default async function PropertyQrPosterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") return null
  const { id } = await params
  const payload = buildPropertyPoster(user.tenantId, decodeURIComponent(id))
  if (!payload) notFound()

  const hdrs = await headers()
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "127.0.0.1:43123"
  const proto = hdrs.get("x-forwarded-proto") ?? "http"
  const origin = `${proto}://${host}`
  const targetUrl = absolutePublicUrl(origin, payload.publicPath)
  const qr = payload.gate.ok ? await qrDataUrl(targetUrl) : ""

  const backLinks = (
    <p className="mb-4 text-sm text-ink-soft print:hidden">
      <Link href={payload.backHref} className="text-terra hover:underline">
        Back to floor plan
      </Link>
      {" · "}
      <Link href="/landlord/properties" className="text-terra hover:underline">
        All properties
      </Link>
    </p>
  )

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          kicker="Printable"
          title={`QR poster · ${payload.title}`}
          lede="Property-level poster. Size is the sum of every bay with a positive sq ft. QR opens the public property page."
        />
        {backLinks}
      </div>
      {payload.gate.ok ? (
        <QrPoster
          qrDataUrl={qr}
          buildingName={payload.title}
          unitCode="property"
          subtitle={payload.subtitle}
          targetUrl={targetUrl}
          landlordName={payload.tenantName}
          contactEmail={payload.email ?? ""}
          address={payload.address ?? ""}
          sqft={payload.sizeSqft ?? 0}
          filenameBase={`easy-rental-${payload.propertyId}`}
        />
      ) : (
        <div
          className="border border-terra/40 bg-terra/10 px-4 py-4 text-sm text-ink"
          data-testid="poster-gate"
        >
          <p className="font-semibold">Cannot build this QR poster.</p>
          <ul className="mt-2 list-disc pl-5">
            {payload.gate.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
