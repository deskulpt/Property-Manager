import {
  delistUnitForm,
  deleteUnitForm,
  createListingUnitForm,
  relistUnitForm,
  saveListingPricingForm,
} from "@/lib/actions"
import { EmptyState, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { money, rateCaption, sqft } from "@/lib/format"

type ListingRow = {
  id: string
  code: string
  sqft: number
  ratePsf: number
  status: string
  listed: boolean
  description: string
  matterportUrl: string | null
  propertyId: string
  propertyName: string
  area: string
  monthlyCents: number
}

type PropertyOpt = { id: string; name: string }

export function ListingEditor({
  listings,
  properties,
  allowCreate = true,
  allowDelete = true,
}: {
  listings: ListingRow[]
  properties: PropertyOpt[]
  allowCreate?: boolean
  allowDelete?: boolean
}) {
  return (
    <div className="grid gap-8">
      {allowCreate ? (
        <section className="card rounded-sm border border-base-300 bg-base-100 p-4" data-testid="listing-create">
          <h2 className="font-serif text-lg font-semibold text-primary">Create listing</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Add a bay under a building you manage. Asking rent stays in ₹/SF/month.
          </p>
          <form action={createListingUnitForm} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="form-control grid gap-1 text-sm sm:col-span-2">
              Building
              <select name="propertyId" required className="select select-bordered select-sm rounded-sm">
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control grid gap-1 text-sm">
              Unit code
              <input
                name="code"
                required
                placeholder="D1"
                className="input input-bordered input-sm rounded-sm"
              />
            </label>
            <label className="form-control grid gap-1 text-sm">
              Area (SF)
              <input
                name="sqft"
                type="number"
                min={100}
                required
                defaultValue={10000}
                className="input input-bordered input-sm rounded-sm"
              />
            </label>
            <label className="form-control grid gap-1 text-sm">
              Rate ({rateCaption()})
              <input
                name="ratePsf"
                type="number"
                step="0.01"
                min={1}
                required
                defaultValue={45}
                className="input input-bordered input-sm rounded-sm"
              />
            </label>
            <label className="form-control grid gap-1 text-sm">
              Clear height
              <input
                name="clearHeight"
                defaultValue="7.5 m"
                className="input input-bordered input-sm rounded-sm"
              />
            </label>
            <label className="form-control grid gap-1 text-sm sm:col-span-2">
              Description
              <textarea
                name="description"
                rows={2}
                className="textarea textarea-bordered rounded-sm text-sm"
                defaultValue="Industrial bay ready to lease."
              />
            </label>
            <div className="sm:col-span-2">
              <SubmitButton pendingLabel="Creating…" className="btn btn-primary btn-sm rounded-sm">
                Create unit listing
              </SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      {listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          body="Create a unit above, or open Floors & 3D to place floor-plan pins after CAD ingest."
          action={{ href: "/landlord/properties", label: "Open floors & 3D" }}
        />
      ) : (
        <div className="grid gap-4" data-testid="listing-editor-list">
          {listings.map((row) => {
            const delisted = row.status === "hold" || !row.listed
            return (
              <article
                key={row.id}
                className="card rounded-sm border border-base-300 bg-base-100 p-4 transition-colors hover:border-secondary/40"
                data-testid={`listing-row-${row.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg font-semibold text-primary">
                    {row.propertyName} · Unit {row.code}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.status} />
                    <span className="badge badge-ghost badge-sm rounded-sm font-mono uppercase">
                      {row.listed ? "Published" : "Hidden"}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {sqft(row.sqft)} · {money(row.monthlyCents)} / month · {row.area}
                </p>
                <form action={saveListingPricingForm} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="unitId" value={row.id} />
                  <label className="form-control grid gap-1 text-sm">
                    Rate ({rateCaption()})
                    <input
                      name="ratePsf"
                      type="number"
                      step="0.01"
                      min={1}
                      required
                      defaultValue={row.ratePsf}
                      className="input input-bordered input-sm rounded-sm"
                    />
                  </label>
                  <label className="form-control grid gap-1 text-sm">
                    Visibility
                    <select
                      name="listed"
                      defaultValue={row.listed ? "1" : "0"}
                      className="select select-bordered select-sm rounded-sm"
                    >
                      <option value="1">Published on listings</option>
                      <option value="0">Hidden from public listings</option>
                    </select>
                  </label>
                  <label className="form-control grid gap-1 text-sm sm:col-span-2">
                    Matterport show URL (optional)
                    <input
                      name="matterportUrl"
                      defaultValue={row.matterportUrl ?? ""}
                      placeholder="https://my.matterport.com/show/?m=…"
                      className="input input-bordered input-sm rounded-sm"
                    />
                  </label>
                  <label className="form-control grid gap-1 text-sm sm:col-span-2">
                    Description
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={row.description}
                      className="textarea textarea-bordered rounded-sm text-sm"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <SubmitButton pendingLabel="Saving…" className="btn btn-primary btn-sm rounded-sm">
                      Save listing
                    </SubmitButton>
                  </div>
                </form>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-base-300 pt-3">
                  {delisted ? (
                    <form action={relistUnitForm}>
                      <input type="hidden" name="unitId" value={row.id} />
                      <SubmitButton
                        pendingLabel="Relisting…"
                        className="btn btn-secondary btn-sm rounded-sm"
                      >
                        Relist on catalogue
                      </SubmitButton>
                    </form>
                  ) : (
                    <form action={delistUnitForm}>
                      <input type="hidden" name="unitId" value={row.id} />
                      <SubmitButton
                        pendingLabel="Delisting…"
                        className="btn btn-accent btn-sm rounded-sm"
                      >
                        Delist (hold)
                      </SubmitButton>
                    </form>
                  )}
                  {allowDelete && row.status !== "leased" ? (
                    <form action={deleteUnitForm}>
                      <input type="hidden" name="unitId" value={row.id} />
                      <SubmitButton
                        pendingLabel="Deleting…"
                        variant="destructive"
                        className="btn btn-error btn-outline btn-sm rounded-sm"
                      >
                        Delete unit
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
