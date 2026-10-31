import "server-only"
import { createRequire } from "node:module"
import path from "node:path"
import type { RustApi } from "@/lib/rust/load.browser"
import {
  peekBrowserRustCache,
  resetBrowserRustCache,
  setBrowserRustCache,
} from "@/lib/rust/load.browser"

/**
 * Sync Node WASM loader. Marked server-only so webpack client graphs never see
 * `node:module` / `node:path`.
 */

function forceTsFallback(): boolean {
  return (
    process.env.EASYRENT_FORCE_TS_CORE === "1" ||
    process.env.EASYRENTAL_FORCE_TS_CORE === "1"
  )
}

function loadNodeWasm(): RustApi {
  const req = createRequire(__filename)
  const wasmJs = path.join(process.cwd(), "packages/easyrent-wasm/node/easyrent_wasm.js")
  return req(wasmJs) as RustApi
}

export function getRust(): RustApi | null {
  const cached = peekBrowserRustCache()
  if (cached !== undefined) return cached
  if (forceTsFallback()) {
    setBrowserRustCache(null)
    return null
  }
  try {
    const api = loadNodeWasm()
    setBrowserRustCache(api)
    return api
  } catch {
    setBrowserRustCache(null)
    return null
  }
}

export function rustAvailable(): boolean {
  return getRust() != null
}

export function rustCoreBackend(): "wasm" | "fallback" {
  return getRust() ? "wasm" : "fallback"
}

/** Reset loader cache (tests only). */
export function resetRustCache() {
  resetBrowserRustCache()
}
