/**
 * Browser-safe Rust WASM loader. No node: builtins — safe for client components.
 * Node/WASM sync path lives in `load.node.ts` (server-only).
 */

export type RustApi = {
  late_fee_cents: (rent: number, flat: number, bps: number) => number
  gst_cents: (taxable: number, bps: number) => number
  monthly_rent_cents: (
    rateMilli: number,
    area: number,
    minorPerMajor: number,
    monthPeriod: boolean,
  ) => number
  fx_micros: (currency: string) => number
  convert_from_inr_minor_display_cents: (inr: number, micros: number) => number
  convert_from_inr_minor_major_milli: (inr: number, micros: number) => number
  snap_pct: (value: number, grid: number) => number
  sanitize_plan_label: (input: string) => string
  normalize_slug: (input: string) => string
  slugifyOrg?: (input: string) => string
  sqyd_to_sqft: (sqyd: number) => number
  sqft_to_sqyd: (sqft: number) => number
  auto_partition_layout: (
    totalArea: number,
    partitionsJson: string,
    seed: number,
    hasSeed: boolean,
    unit: string,
  ) => string
  rustCoreVersion?: () => string
  isValidTenantId?: (id: string) => boolean
  isValidSlug?: (slug: string) => boolean
}

let cached: RustApi | null | undefined
let browserPromise: Promise<RustApi | null> | null = null

function forceTsFallback(): boolean {
  if (typeof process === "undefined") return false
  return (
    process.env.EASYRENT_FORCE_TS_CORE === "1" ||
    process.env.EASYRENTAL_FORCE_TS_CORE === "1"
  )
}

function isNode(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node)
}

/**
 * Prefer for client components — loads bundler WASM once.
 * Never imports `load.node` (keeps `node:module` out of the client graph).
 * On Node/SSR, return whatever sync `getRust()` already cached, else null.
 */
export async function ensureBrowserRust(): Promise<RustApi | null> {
  if (cached) return cached
  if (isNode() || typeof window === "undefined") {
    return cached ?? null
  }
  if (forceTsFallback()) {
    cached = null
    return null
  }
  if (!browserPromise) {
    browserPromise = (async () => {
      try {
        const mod = (await import(
          "../../packages/easyrent-wasm/bundler/easyrent_wasm.js"
        )) as unknown as RustApi
        cached = mod
        return mod
      } catch {
        cached = null
        return null
      }
    })()
  }
  return browserPromise
}

/** Reset loader cache (tests only). */
export function resetBrowserRustCache() {
  cached = undefined
  browserPromise = null
}

export function peekBrowserRustCache(): RustApi | null | undefined {
  return cached
}

export function setBrowserRustCache(api: RustApi | null | undefined) {
  cached = api
}
