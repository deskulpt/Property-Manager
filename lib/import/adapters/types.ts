import type { ImportedListing, ListingSiteId } from "@/lib/import/listing-schema"

export type ListingAdapter = {
  id: ListingSiteId
  canHandle(url: URL): boolean
  parse(html: string, url: URL): ImportedListing
}
