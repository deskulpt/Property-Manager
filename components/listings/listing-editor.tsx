import { EmptyState } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { createListingUnitForm, saveListingPricingForm } from "@/lib/actions"
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
}: {
  listings: ListingRow[]
  properties: PropertyOpt[]
  allowCreate?: boolean
}) {
  return (
    <div className="grid gap-8">
      {allowCreate ? (
        <section className="border border-ink/10 bg-card p-4" data-testid="listing-create">
          <h2 className="font-serif text-lg font-semibold">Create listing</h2>
          <p className="mt-1 text-sm text-ink-soft">Add a bay under a building you manage. Asking rent stays in ₹/SF/month.</p>
          <form action={createListingUnitForm} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm sm:col-span-2">
              Building
              <select name="propertyId" required className="h-9 border border-ink/15 bg-paper px-2 text-sm">
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Unit code
              <input name="code" required placeholder="D1" className="h-9 border border-ink/15 bg-paper px-2 text-sm" />
            </label>
            <label className="grid gap-1 text-sm">
              Area (SF)
              <input name="sqft" type="number" min={100} required defaultValue={10000} className="h-9 border border-ink/15 bg-paper px-2 text-sm" />
            </label>
            <label className="grid gap-1 text-sm">
              Rate ({rateCaption()})
              <input name="ratePsf" type="number" step="0.01" min={1} required defaultValue={45} className="h-9 border border-ink/15 bg-paper px-2 text-sm" />
            </label>
            <label className="grid gap-1 text-sm">
              Clear height
              <input name="clearHeight" defaultValue="7.5 m" className="h-9 border border-ink/15 bg-paper px-2 text-sm" />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Description
              <textarea name="description" rows={2} className="border border-ink/15 bg-paper px-2 py-1.5 text-sm" defaultValue="Industrial bay ready to lease." />
            </label>
            <div className="sm:col-span-2">
              <SubmitButton pendingLabel="Creating…">Create unit listing</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      {listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          body="Create a unit above, or open a building to place floor-plan pins."
          action={{ href: "/landlord/properties", label: "Open properties" }}
        />
      ) : (
        <div className="grid gap-4" data-testid="listing-editor-list">
          {listings.map((row) => (
            <article key={row.id} className="border border-ink/10 bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-lg font-semibold">
                  {row.propertyName} · Unit {row.code}
                </h3>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  {row.status} · {row.listed ? "Listed" : "Hidden"}
                </p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {sqft(row.sqft)} · {money(row.monthlyCents)} / month · {row.area}
              </p>
              <form action={saveListingPricingForm} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="unitId" value={row.id} />
                <label className="grid gap-1 text-sm">
                  Rate ({rateCaption()})
                  <input name="ratePsf" type="number" step="0.01" min={1} required defaultValue={row.ratePsf} className="h-9 border border-ink/15 bg-paper px-2 text-sm" />
                </label>
                <label className="grid gap-1 text-sm">
                  Visibility
                  <select name="listed" defaultValue={row.listed ? "1" : "0"} className="h-9 border border-ink/15 bg-paper px-2 text-sm">
                    <option value="1">Published on listings</option>
                    <option value="0">Hidden from public listings</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm sm:col-span-2">
                  Matterport show URL (optional)
                  <input name="matterportUrl" defaultValue={row.matterportUrl ?? ""} placeholder="https://my.matterport.com/show/?m=…" className="h-9 border border-ink/15 bg-paper px-2 text-sm" />
                </label>
                <label className="grid gap-1 text-sm sm:col-span-2">
                  Description
                  <textarea name="description" rows={2} defaultValue={row.description} className="border border-ink/15 bg-paper px-2 py-1.5 text-sm" />
                </label>
                <div className="sm:col-span-2">
                  <SubmitButton pendingLabel="Saving…">Save listing</SubmitButton>
                </div>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
