"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type { ImportedListing, ListingSiteMeta } from "@/lib/import/listing-schema"

type Props = {
  sites: ListingSiteMeta[]
  tenantId?: string | null
  /** Portfolio list route after create */
  propertiesHref: string
  /** Optional property detail prefix, e.g. `/landlord/properties` */
  propertyDetailPrefix?: string
}

type PreviewState = {
  listing: ImportedListing
  usedFixture: boolean
  fetchNote: string
  disclaimer: string
}

export function ImportListingForm({
  sites,
  tenantId,
  propertiesHref,
  propertyDetailPrefix,
}: Props) {
  const router = useRouter()
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "nobroker")
  const [url, setUrl] = useState(sites[0]?.exampleUrl ?? "")
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selected = sites.find((s) => s.id === siteId) ?? sites[0]

  function onSiteChange(next: string) {
    setSiteId(next as typeof siteId)
    const meta = sites.find((s) => s.id === next)
    if (meta) setUrl(meta.exampleUrl)
    setPreview(null)
    setError(null)
    setCreatedId(null)
  }

  async function callApi(action: "preview" | "create") {
    setError(null)
    const res = await fetch("/api/listings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        url,
        action,
        tenantId: tenantId || undefined,
      }),
    })
    const data = (await res.json()) as {
      error?: string
      listing?: ImportedListing
      usedFixture?: boolean
      fetchNote?: string
      disclaimer?: string
      draft?: { id: string; propertyId: string }
    }
    if (!res.ok) {
      throw new Error(data.error ?? "Request failed")
    }
    return data
  }

  function onFetch() {
    startTransition(async () => {
      try {
        const data = await callApi("preview")
        if (!data.listing) throw new Error("No listing returned")
        setPreview({
          listing: data.listing,
          usedFixture: Boolean(data.usedFixture),
          fetchNote: data.fetchNote ?? "",
          disclaimer: data.disclaimer ?? "",
        })
        setCreatedId(null)
      } catch (err) {
        setPreview(null)
        setError(err instanceof Error ? err.message : "Fetch failed")
      }
    })
  }

  function onCreate() {
    startTransition(async () => {
      try {
        const data = await callApi("create")
        if (!data.draft) throw new Error("Draft was not created")
        setCreatedId(data.draft.propertyId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed")
      }
    })
  }

  return (
    <div className="grid gap-6" data-testid="import-listing">
      <section className="border border-ink/10 bg-card p-4 md:p-5">
        <h2 className="font-serif text-lg font-semibold">Import listing</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Choose a pre-identified site, paste the listing URL, fetch a field preview, then create a
          draft in this organisation.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            Listing site
            <select
              data-testid="import-site"
              value={siteId}
              onChange={(e) => onSiteChange(e.target.value)}
              className="h-10 border border-ink/15 bg-paper px-2 text-sm"
            >
              <optgroup label="India">
                {sites
                  .filter((s) => s.market === "IN")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Canada">
                {sites
                  .filter((s) => s.market === "CA")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Listing URL
            <input
              data-testid="import-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={selected?.exampleUrl}
              className="h-10 border border-ink/15 bg-paper px-2 text-sm"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="import-fetch"
              disabled={pending || !url}
              onClick={onFetch}
              className="h-10 bg-brand px-4 text-sm font-semibold text-paper disabled:opacity-50"
            >
              {pending && !preview ? "Fetching…" : "Fetch"}
            </button>
            {preview ? (
              <button
                type="button"
                data-testid="import-create"
                disabled={pending || Boolean(createdId)}
                onClick={onCreate}
                className="h-10 border border-terra px-4 text-sm font-semibold text-terra disabled:opacity-50"
              >
                {createdId ? "Draft created" : pending ? "Creating…" : "Create draft listing"}
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {createdId ? (
          <p className="mt-3 text-sm text-avail" role="status">
            Draft property created.{" "}
            {propertyDetailPrefix ? (
              <>
                <Link
                  href={`${propertyDetailPrefix}/${createdId}`}
                  className="font-semibold underline"
                >
                  Open property
                </Link>{" "}
                or{" "}
              </>
            ) : null}
            <Link href={propertiesHref} className="font-semibold underline">
              view portfolio
            </Link>
            .
          </p>
        ) : null}
      </section>

      {preview ? (
        <section
          className="border border-ink/10 bg-card p-4 md:p-5"
          data-testid="import-preview"
          aria-live="polite"
        >
          <h2 className="font-serif text-lg font-semibold">Mapped fields</h2>
          <p className="mt-1 text-sm text-ink-soft">{preview.fetchNote}</p>
          {preview.usedFixture ? (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-terra">
              Demo fixture used
            </p>
          ) : null}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {(
              [
                ["Title", preview.listing.title],
                ["Address", preview.listing.address],
                ["City", preview.listing.city],
                ["PIN / Postal", preview.listing.postalCode],
                ["SF", String(preview.listing.sqft)],
                [
                  "Rent",
                  `${preview.listing.currency} ${preview.listing.rent.toLocaleString("en-IN")}`,
                ],
                [
                  "Deposit",
                  preview.listing.deposit != null
                    ? `${preview.listing.currency} ${preview.listing.deposit.toLocaleString("en-IN")}`
                    : "—",
                ],
                ["Type", preview.listing.propertyType],
                ["Source", preview.listing.sourceSite],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {label}
                </dt>
                <dd className="mt-0.5 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {preview.listing.amenities.length > 0 ? (
            <p className="mt-4 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                Amenities
              </span>
              <br />
              {preview.listing.amenities.join(" · ")}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-ink-soft">{preview.listing.description}</p>
        </section>
      ) : null}

      <aside
        className="border border-terra/25 bg-accent/40 px-4 py-3 text-sm text-terra-dark"
        data-testid="import-disclaimer"
      >
        <strong className="font-semibold">Rights &amp; robots.</strong> Only import listings you
        have rights to reuse. Respect each site’s robots.txt and terms of service. Easy Rental never
        bypasses login walls or CAPTCHAs. This demo may map fields from fixture HTML when a live
        public page cannot be fetched.
      </aside>
    </div>
  )
}
