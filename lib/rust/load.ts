/**
 * Load easyrent-wasm. Node (Vitest / RSC / server actions) uses the sync nodejs
 * target. Browser loads the bundler target once via `ensureBrowserRust()`.
 *
 * Set `EASYRENT_FORCE_TS_CORE=1` (or legacy `EASYRENTAL_FORCE_TS_CORE=1` from
 * sibling PR #14) to force the TypeScript fallback.
 *
 * Node builtins are required only inside `isNode()` branches so the client
 * graph does not resolve `node:path` / `node:module`.
 */

type RustApi = {
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

function isNode(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node)
}

function forceTsFallback(): boolean {
  return (
    process.env.EASYRENT_FORCE_TS_CORE === "1" ||
    process.env.EASYRENTAL_FORCE_TS_CORE === "1"
  )
}

function loadNodeWasm(): RustApi {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createRequire } = require("node:module") as typeof import("node:module")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path")
  const req = createRequire(__filename)
  const wasmJs = path.join(process.cwd(), "packages/easyrent-wasm/node/easyrent_wasm.js")
  return req(wasmJs) as RustApi
}

export function getRust(): RustApi | null {
  if (cached !== undefined) return cached
  if (!isNode()) {
    return null
  }
  if (forceTsFallback()) {
    cached = null
    return null
  }
  try {
    cached = loadNodeWasm()
    return cached
  } catch {
    cached = null
    return null
  }
}

/** Prefer for client components — loads bundler WASM once. */
export async function ensureBrowserRust(): Promise<RustApi | null> {
  if (cached) return cached
  if (isNode()) {
    return getRust()
  }
  if (typeof window === "undefined") return null
  if (forceTsFallback()) {
    cached = null
    return null
  }
  if (!browserPromise) {
    browserPromise = (async () => {
      try {
        // wasm-pack `--target bundler` wires the module on import (no async init).
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

export function rustAvailable(): boolean {
  return getRust() != null
}

export function rustCoreBackend(): "wasm" | "fallback" {
  return getRust() ? "wasm" : "fallback"
}

/** Reset loader cache (tests only). */
export function resetRustCache() {
  cached = undefined
  browserPromise = null
}
