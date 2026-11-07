import "server-only"
/**
 * Wire meta-table LEGAL overrides for Admin compliance toggles (sibling ER-47).
 * Safe to call repeatedly from layout / enforce.
 */
import {
  LEGAL_OVERRIDE_META_PREFIX,
  legalOverrideMetaKey,
  setLegalFlagOverride,
  clearLegalFlagOverride,
  listComplianceFlagRows,
} from "@/lib/markets/compliance-contract"
import {
  registerLegalFlagOverrideReader,
  type LegalFeatureFlagKey,
  LEGAL_FEATURE_FLAG_KEYS,
} from "@/lib/markets/legal-flags"
import { getMetaValue, setMetaValue } from "@/lib/platform-ops"

let registered = false

export function ensureLegalFlagOverridesRegistered() {
  if (registered) return
  registerLegalFlagOverrideReader((iso, key) => {
    const raw = getMetaValue(legalOverrideMetaKey(iso, key))
    if (raw == null || raw === "") return null
    return raw === "1" || raw === "true" || raw === "on"
  })
  registered = true
}

export function adminSetLegalFlag(iso: string, key: LegalFeatureFlagKey, on: boolean) {
  ensureLegalFlagOverridesRegistered()
  if (!LEGAL_FEATURE_FLAG_KEYS.includes(key)) {
    return { ok: false as const, error: "Unknown legal flag." }
  }
  return setLegalFlagOverride({ getMetaValue, setMetaValue }, iso, key, on)
}

export function adminClearLegalFlag(iso: string, key: LegalFeatureFlagKey) {
  ensureLegalFlagOverridesRegistered()
  return clearLegalFlagOverride({ getMetaValue, setMetaValue }, iso, key)
}

export function adminListComplianceFlags(isos?: string[]) {
  ensureLegalFlagOverridesRegistered()
  return listComplianceFlagRows(isos)
}

export { LEGAL_OVERRIDE_META_PREFIX }
