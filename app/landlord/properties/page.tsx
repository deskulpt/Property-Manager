import Link from "next/link"
import { deletePropertyForm } from "@/lib/actions"
import { EmptyState, ErrorBanner, NoticeBanner, PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { listPortfolio } from "@/lib/db"
import { sqft } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Floors & 3D" }

export default async function LandlordProperties({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; error?: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = (await searchParams) ?? {}
  const properties = listPortfolio().filter((property) => property.tenantId === user.tenantId)
  return (
    <div>
      <PageHeader
        kicker="USP · Buildings"
        title="Floors, CAD ingest & 3D"
        lede="Open a building for plan creator, CAD/PDF floor ingest, hotspot pins, interactive 3D mesh binds, and Matterport links. This is the leasing visualizer prospects experience."
        actions={
          <Link href="/landlord/properties/new" className="btn btn-primary btn-sm rounded-sm">
            Add property
          </Link>
        }
      />
      <NoticeBanner notice={params.notice} />
      <ErrorBanner message={params.error} />

      {properties.length === 0 ? (
        <EmptyState
          title="No buildings yet"
          body="Add a property, then draft floors and ingest CAD/PDF to unlock the 3D leasing desk."
          action={{ href: "/landlord/properties/new", label: "Add property" }}
        />
      ) : (
        <div className="grid gap-4">
          {properties.map((property) => (
            <article
              key={property.id}
              className="card rounded-sm border border-base-300 bg-base-100 transition-colors hover:border-secondary/40"
              data-testid="landlord-property-card"
            >
              <div className="card-body gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl font-semibold text-primary">
                      <Link
                        href={`/landlord/properties/${property.id}`}
                        className="hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                      >
                        {property.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-ink-soft">
                      {property.segment} · {property.address} · {property.area} ·{" "}
                      {property.units.length} unit{property.units.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/landlord/properties/${property.id}#plan-creator`}
                      className="btn btn-primary btn-sm rounded-sm"
                    >
                      Plan creator
                    </Link>
                    <Link
                      href={`/landlord/properties/${property.id}#cad-ingest`}
                      className="btn btn-secondary btn-sm rounded-sm"
                    >
                      CAD / PDF
                    </Link>
                    <Link
                      href={`/landlord/properties/${property.id}#building-3d`}
                      className="btn btn-outline btn-sm rounded-sm"
                    >
                      3D viewer
                    </Link>
                    <form action={deletePropertyForm}>
                      <input type="hidden" name="propertyId" value={property.id} />
                      <SubmitButton
                        pendingLabel="Deleting…"
                        variant="destructive"
                        className="btn btn-error btn-outline btn-sm rounded-sm"
                      >
                        Delete building
                      </SubmitButton>
                    </form>
                  </div>
                </div>
                <ul className="grid gap-2 border-t border-base-300 pt-3">
                  {property.units.map((unit) => (
                    <li
                      key={unit.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        <span className="font-semibold">Unit {unit.code}</span>
                        <span className="text-ink-soft"> · {sqft(unit.sqft)}</span>
                      </span>
                      <Link
                        href={`/landlord/poster/${unit.id}`}
                        className="link link-hover text-secondary font-semibold"
                      >
                        Print QR poster
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
