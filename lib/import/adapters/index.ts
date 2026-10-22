import { parseListingHtml } from "@/lib/import/adapters/parse-common"
import type { ListingAdapter } from "@/lib/import/adapters/types"
import {
  hostMatchesSite,
  LISTING_SITES,
  type ListingSiteId,
  siteById,
} from "@/lib/import/listing-schema"

function makeAdapter(id: ListingSiteId): ListingAdapter {
  const meta = siteById(id)
  return {
    id,
    canHandle(url) {
      return hostMatchesSite(url.hostname, meta)
    },
    parse(html, url) {
      return parseListingHtml(html, url, id)
    },
  }
}

export const LISTING_ADAPTERS: ListingAdapter[] = LISTING_SITES.map((s) => makeAdapter(s.id))

export function adapterForSite(id: ListingSiteId): ListingAdapter {
  const found = LISTING_ADAPTERS.find((a) => a.id === id)
  if (!found) throw new Error(`No adapter for ${id}`)
  return found
}

export function resolveAdapter(url: URL, preferred?: ListingSiteId): ListingAdapter | null {
  if (preferred) {
    const preferredAdapter = adapterForSite(preferred)
    if (preferredAdapter.canHandle(url)) return preferredAdapter
    return null
  }
  return LISTING_ADAPTERS.find((a) => a.canHandle(url)) ?? null
}
