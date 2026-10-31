/**
 * Client-safe money helpers (pure TypeScript).
 * Server code that needs WASM should call `getRust()` from `@/lib/rust/load`
 * (or `@/lib/rust/load.node`) directly — never pull node loaders into format/UI.
 */
export {
  convertFromInrMinorDisplayCentsFallback as convertFromInrMinorDisplayCents,
  convertFromInrMinorMajorFallback as convertFromInrMinorMajor,
  fxMicrosFallback as fxMicros,
  gstCentsFallback as gstCents,
  isValidSlugFallback as isValidSlug,
  isValidTenantIdFallback as isValidTenantId,
  lateFeeCentsFallback as lateFeeCents,
  monthlyRentCentsFallback as monthlyRentCents,
  normalizeSlugFallback as normalizeSlug,
} from "@/lib/rust/money-fallback"
