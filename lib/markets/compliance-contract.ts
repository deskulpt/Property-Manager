/**
 * Stable contract for Admin compliance toggles (sibling ER-47).
 *
 * Country-path PR (#47) owns fail-closed reads + checkout/API enforcement.
 * Compliance console owns L0 UI to flip overrides — call setLegalFlagOverride /
 * clearLegalFlagOverride; never bypass enforce* helpers at charge/model sites.
 *
 * Override keys in meta: `legal.flag.{ISO}.{LegalFeatureFlagKey}` = "1" | "0"
 * Missing override → CountryPack.legalFeatureFlags (default all OFF).
 */

import {
  LEGAL_FEATURE_FLAG_KEYS,
  type LegalFeatureFlagKey,
  legalFlag,
  resolveLegalFlags,
} from "@/lib/markets/legal-flags"
import { BUILTIN_PACKS } from "@/lib/markets/packs"
import type { CountryPack } from "@/lib/markets/types"

export const LEGAL_OVERRIDE_META_PREFIX = "legal.flag."

export function legalOverrideMetaKey(iso: string, key: LegalFeatureFlagKey): string {
  return `${LEGAL_OVERRIDE_META_PREFIX}${iso.toUpperCase()}.${key}`
}

export type ComplianceFlagRow = {
  iso: string
  key: LegalFeatureFlagKey
  packDefault: boolean
  effective: boolean
  /** Declarative residency blurb — storage does not yet pin regions. */
  dataResidencyNotes: string | null
}

/** Snapshot for Admin compliance UI — sibling should render this list. */
export function listComplianceFlagRows(isos?: string[]): ComplianceFlagRow[] {
  const targets = (isos?.length ? isos : Object.keys(BUILTIN_PACKS)).map((i) => i.toUpperCase())
  const rows: ComplianceFlagRow[] = []
  for (const iso of targets) {
    const pack = BUILTIN_PACKS[iso] as CountryPack | undefined
    if (!pack) continue
    const packFlags = resolveLegalFlags(pack)
    for (const key of LEGAL_FEATURE_FLAG_KEYS) {
      rows.push({
        iso,
        key,
        packDefault: packFlags[key] === true,
        effective: legalFlag(iso, key, pack),
        dataResidencyNotes: pack.dataResidency?.notes ?? null,
      })
    }
  }
  return rows
}

export type LegalOverrideWriter = {
  getMetaValue(key: string): string | null
  setMetaValue(key: string, value: string): void
}

/** Persist override — Admin compliance sibling wires platform-ops meta. */
export function setLegalFlagOverride(
  writer: LegalOverrideWriter,
  iso: string,
  key: LegalFeatureFlagKey,
  on: boolean,
) {
  if (!LEGAL_FEATURE_FLAG_KEYS.includes(key)) {
    return { ok: false as const, error: "Unknown legal flag." }
  }
  writer.setMetaValue(legalOverrideMetaKey(iso, key), on ? "1" : "0")
  return { ok: true as const }
}

export function clearLegalFlagOverride(
  writer: LegalOverrideWriter,
  iso: string,
  key: LegalFeatureFlagKey,
) {
  // Empty string = fall back to pack default (reader treats null/empty as no override).
  writer.setMetaValue(legalOverrideMetaKey(iso, key), "")
  return { ok: true as const }
}
