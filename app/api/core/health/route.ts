import { NextResponse } from "next/server"
import {
  convertFromInrMinorDisplayCents,
  normalizeSlug,
} from "@/lib/rust/money"
import { getRust, rustCoreBackend } from "@/lib/rust/load"

/**
 * Tiny probe for the Rust/wasm compute bridge.
 * Safe for multi-tenant SQLite — no DB touch, no auth required.
 */
export async function GET() {
  const rust = getRust()
  const backend = rustCoreBackend()
  return NextResponse.json({
    ok: true,
    backend,
    version: rust?.rustCoreVersion?.() ?? null,
    crate: "easyrent-core",
    sample: {
      usdDisplayCentsFromInr10000: convertFromInrMinorDisplayCents(10_000, "USD"),
      slug: normalizeSlug("BBM Logistics Parks"),
    },
  })
}
