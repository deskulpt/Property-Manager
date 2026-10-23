import Link from "next/link"
import { notFound } from "next/navigation"
import QRCode from "qrcode"
import { QrPoster } from "@/components/landlord/qr-poster"
import { missingPosterFields } from "@/lib/poster-shared"
import { PageHeader } from "@/components/product"
import { getDb } from "@/lib/db"
import { unitListingUrl } from "@/lib/listing-url"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "QR poster" }

function unitForLandlord(tenantId: string, unitId: string) {
  const row = getDb()
    .prepare(
      `SELECT u.id AS unit_id, u.code, u.sqft, u.tenant_id,
              p.id AS property_id, p.name AS property_name, p.slug AS property_slug,
              p.address AS property_address,
              t.name AS tenant_name
       FROM units u
       JOIN properties p ON p.id = u.property_id
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = ? AND u.tenant_id = ?`,
    )
    .get(unitId, tenantId) as
    | {
        unit_id: string
        code: string
        sqft: number
        tenant_id: string
        property_id: string
        property_name: string
        property_slug: string
        property_address: string
        tenant_name: string
      }
    | undefined
  return row ?? null
}

export default async function QrPosterPage({
  params,
}: {
  params: Promise<{ unitId: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") return null
  const { unitId } = await params
  const unit = unitForLandlord(user.tenantId, decodeURIComponent(unitId))
  if (!unit) notFound()

  const contactEmail = user.email?.trim() ?? ""
  const address = unit.property_address?.trim() ?? ""
  const sqft = Number(unit.sqft)
  const missing = missingPosterFields({ contactEmail, address, sqft })

  const backLinks = (
    <p className="mb-4 text-sm text-ink-soft print:hidden">
      <Link href={`/landlord/properties/${unit.property_id}`} className="text-terra hover:underline">
        Back to floor plan
      </Link>
      {" · "}
      <Link href="/landlord/properties" className="text-terra hover:underline">
        All properties
      </Link>
    </p>
  )

  if (missing.length > 0) {
    return (
      <div>
        <div className="print:hidden">
          <PageHeader
            kicker="Printable"
            title={`QR poster · Unit ${unit.code}`}
            lede="Poster requires landlord contact email, unit address, and size in sq ft before a QR is generated."
          />
          {backLinks}
        </div>
        <div className="border border-terra/40 bg-terra/10 px-4 py-4 text-sm text-ink">
          <p className="font-semibold">Cannot build this QR poster.</p>
          <p className="mt-1">Required details are missing:</p>
          <ul className="mt-2 list-disc pl-5">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-ink-soft">
            Contact email comes from your signed-in landlord account. Address and size come from the
            property and unit records. Fix those, then reload this page — no broken poster is offered.
          </p>
        </div>
      </div>
    )
  }

  const targetUrl = await unitListingUrl(user.tenantId, unit.property_slug, unit.code)
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    width: 640,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#13253A", light: "#FFFFFF" },
  })

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          kicker="Printable"
          title={`QR poster · Unit ${unit.code}`}
          lede="A4-friendly poster with required contact, address, and size. QR opens the public unit page (apply from there). Uses your active PRO custom domain when set; otherwise this server’s origin."
        />
        {backLinks}
      </div>
      <QrPoster
        qrDataUrl={qrDataUrl}
        buildingName={unit.property_name}
        unitCode={unit.code}
        targetUrl={targetUrl}
        landlordName={unit.tenant_name}
        contactEmail={contactEmail}
        address={address}
        sqft={sqft}
      />
    </div>
  )
}
