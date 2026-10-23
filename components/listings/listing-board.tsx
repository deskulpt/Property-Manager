import Link from "next/link"
import { listingSpecLine } from "@/components/listings/unit-specs"
import { StatusBadge } from "@/components/product"
import { money, rateLabel, type UnitStatus } from "@/lib/format"
import { leaseProfile, segmentLabel } from "@/lib/listing-schemas"
import type { ListingCard } from "@/lib/db"

function SpecLine({ card }: { card: ListingCard }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
      {segmentLabel(card.segment)} · {listingSpecLine(card)}
    </span>
  )
}

function RateBlock({ card }: { card: ListingCard }) {
  const profile = leaseProfile(card.segment)
  if (card.rateBasis === "flat_month") {
    return (
      <div>
        <p className="font-mono text-xl font-semibold tracking-tight text-brand">
          {money(card.monthlyCents)}
          <span className="ml-1 text-xs font-normal text-ink-faint">/ mo</span>
        </p>
        <p className="text-sm text-ink-soft">{profile.rateCaption}</p>
      </div>
    )
  }
  return (
    <div>
      <p className="font-mono text-xl font-semibold tracking-tight text-brand">
        ₹{rateLabel(card.ratePsf)}
        <span className="ml-1 text-xs font-normal text-ink-faint">/ SF · mo</span>
      </p>
      <p className="text-sm text-ink-soft">{money(card.monthlyCents)} / mo</p>
    </div>
  )
}

function MediaTags({ card }: { card: ListingCard }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
      {card.floorPlanPath ? (
        <span className="border-l-2 border-terra/50 pl-2">Floor plan</span>
      ) : null}
      {card.hasPano ? <span className="border-l-2 border-terra/50 pl-2">360</span> : null}
      {card.matterportUrl ? (
        <span className="border-l-2 border-terra/50 pl-2">Walkthrough</span>
      ) : null}
    </div>
  )
}

/** Featured — full-bleed photo left, specs right */
function FeaturedCard({ card }: { card: ListingCard }) {
  return (
    <article className="grid overflow-hidden border border-ink/10 bg-card md:grid-cols-[1.15fr_1fr]">
      <Link
        href={`/properties/${card.propertySlug}/units/${card.code}`}
        className="relative block min-h-[220px] bg-paper-3"
      >
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="blueprint-grid absolute inset-0 opacity-60" />
        )}
      </Link>
      <div className="flex flex-col p-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-terra">
          {card.tenantName} · {card.area}
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight">
          <Link
            href={`/properties/${card.propertySlug}/units/${card.code}`}
            className="hover:text-terra"
          >
            {card.propertyName} · Unit {card.code}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{card.address}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={card.status as UnitStatus} />
          <SpecLine card={card} />
        </div>
        <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{card.description}</p>
        <MediaTags card={card} />
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
          <RateBlock card={card} />
          <div className="flex flex-col gap-2 items-stretch sm:items-end">
            <Link
              href={`/properties/${card.propertySlug}/units/${card.code}`}
              className="bg-terra px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-terra-dark"
            >
              Open unit
            </Link>
            <Link
              href={`/properties/${card.propertySlug}/book?unit=${card.code}`}
              className="border border-ink/20 px-3 py-2 text-center text-sm font-semibold transition-colors hover:border-terra hover:text-terra"
            >
              Book a visit
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

/** Compact row — thumb + text */
function RowCard({ card }: { card: ListingCard }) {
  return (
    <article className="grid gap-3 border border-ink/10 bg-card p-3 transition-colors hover:border-terra/40 sm:grid-cols-[140px_1fr_auto] sm:items-center">
      <Link
        href={`/properties/${card.propertySlug}/units/${card.code}`}
        className="relative block aspect-[4/3] overflow-hidden bg-paper-3 sm:aspect-auto sm:h-[96px]"
      >
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="blueprint-grid h-full w-full opacity-50" />
        )}
      </Link>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-wider text-terra">
          {card.tenantName} · {card.area}
        </p>
        <h2 className="mt-0.5 truncate font-serif text-lg font-semibold">
          <Link
            href={`/properties/${card.propertySlug}/units/${card.code}`}
            className="hover:text-terra"
          >
            {card.propertyName} · {card.code}
          </Link>
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={card.status as UnitStatus} />
          <SpecLine card={card} />
        </div>
      </div>
      <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
        <RateBlock card={card} />
        <div className="flex flex-col gap-1.5 items-end">
          <Link
            href={`/properties/${card.propertySlug}/units/${card.code}`}
            className="border border-ink/20 px-3 py-1.5 text-sm font-semibold transition-colors hover:border-terra hover:text-terra"
          >
            Open
          </Link>
          <Link
            href={`/properties/${card.propertySlug}/book?unit=${card.code}`}
            className="text-sm font-semibold text-terra hover:underline"
          >
            Book a visit
          </Link>
        </div>
      </div>
    </article>
  )
}

/** Mosaic tile — image-forward square */
function TileCard({ card }: { card: ListingCard }) {
  return (
    <article className="group flex flex-col overflow-hidden border border-ink/10 bg-card">
      <Link
        href={`/properties/${card.propertySlug}/units/${card.code}`}
        className="relative block aspect-[16/10] bg-paper-3"
      >
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="blueprint-grid h-full w-full opacity-50" />
        )}
        <span className="absolute top-2 left-2">
          <StatusBadge status={card.status as UnitStatus} />
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-terra">{card.area}</p>
        <h2 className="mt-1 font-serif text-base font-semibold leading-snug">
          <Link
            href={`/properties/${card.propertySlug}/units/${card.code}`}
            className="hover:text-terra"
          >
            {card.propertyName} · {card.code}
          </Link>
        </h2>
        <div className="mt-2">
          <RateBlock card={card} />
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 text-sm font-semibold">
          <Link
            href={`/properties/${card.propertySlug}/units/${card.code}`}
            className="text-terra hover:underline"
          >
            View unit →
          </Link>
          <Link
            href={`/properties/${card.propertySlug}/book?unit=${card.code}`}
            className="text-ink-soft hover:text-terra hover:underline"
          >
            Book a visit
          </Link>
        </div>
      </div>
    </article>
  )
}

/**
 * Mix three layout patterns so the directory is not one repeated card shell:
 * featured (image split), compact row, and image mosaic tiles.
 */
export function ListingBoard({ results }: { results: ListingCard[] }) {
  const featured = results.filter((_, i) => i % 5 === 0)
  const rest = results.filter((_, i) => i % 5 !== 0)
  const rows = rest.filter((_, i) => i % 3 !== 0)
  const tiles = rest.filter((_, i) => i % 3 === 0)

  return (
    <div className="grid gap-8">
      {featured.length ? (
        <section className="grid gap-4" aria-label="Featured bays">
          {featured.map((card) => (
            <FeaturedCard key={card.unitId} card={card} />
          ))}
        </section>
      ) : null}

      {tiles.length ? (
        <section aria-label="Photo grid">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            Photo grid
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tiles.map((card) => (
              <TileCard key={card.unitId} card={card} />
            ))}
          </div>
        </section>
      ) : null}

      {rows.length ? (
        <section aria-label="Directory rows">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            Directory
          </p>
          <div className="grid gap-2">
            {rows.map((card) => (
              <RowCard key={card.unitId} card={card} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
