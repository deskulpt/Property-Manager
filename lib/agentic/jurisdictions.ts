/**
 * Demo jurisdiction presets for Ask Easy lease onboard (IN + CA).
 * Short blurbs only — not legal advice. UI must show a disclaimer.
 */

export type JurisdictionCountry = "IN" | "CA"

export type RegionPreset = {
  code: string
  name: string
  /** Short demo blurb of applicable themes — not counsel. */
  lawBlurb: string
}

export type CountryJurisdiction = {
  country: JurisdictionCountry
  name: string
  regions: RegionPreset[]
  /** Country-level themes shown when region unknown. */
  defaultLawBlurb: string
}

export const JURISDICTION_PRESETS: Record<JurisdictionCountry, CountryJurisdiction> = {
  IN: {
    country: "IN",
    name: "India",
    defaultLawBlurb:
      "Indian state rent / lease frameworks + stamp duty / registration themes vary by state. Commercial leases often mirror Transfer of Property Act concepts; confirm local stamp & registration.",
    regions: [
      {
        code: "MH",
        name: "Maharashtra",
        lawBlurb:
          "Maharashtra stamp duty & registration practice for lease deeds; local rent-control legacy for some residential stock; commercial C&I commonly registered lease + GST themes.",
      },
      {
        code: "KA",
        name: "Karnataka",
        lawBlurb:
          "Karnataka stamp & registration for lease instruments; Bengaluru commercial practice often uses fixed-term leases with lock-in and escalation clauses.",
      },
      {
        code: "TN",
        name: "Tamil Nadu",
        lawBlurb:
          "Tamil Nadu stamp/registration for leases; Chennai/Sriperumbudur industrial leases typically fixed term with deposits and fit-out carve-outs.",
      },
      {
        code: "GJ",
        name: "Gujarat",
        lawBlurb:
          "Gujarat stamp & registration themes for lease deeds; industrial corridors commonly use English-form leases with security deposit and CAM.",
      },
      {
        code: "DL",
        name: "Delhi (NCT)",
        lawBlurb:
          "NCT of Delhi stamp/registration practice; commercial leases often reference leave-and-licence style terms in practice — verify instrument type with counsel.",
      },
      {
        code: "TG",
        name: "Telangana",
        lawBlurb:
          "Telangana stamp & registration for leases; Hyderabad commercial practice emphasises lock-in, escalation, and reinstatement.",
      },
    ],
  },
  CA: {
    country: "CA",
    name: "Canada",
    defaultLawBlurb:
      "Canadian residential tenancy statutes are provincial/territorial; commercial leases are largely common-law contracts. Confirm the correct statute and municipal bylaws for the property.",
    regions: [
      {
        code: "ON",
        name: "Ontario",
        lawBlurb:
          "Residential: Residential Tenancies Act (RTA) + LTB themes. Commercial: largely freedom of contract; consider Commercial Tenancies Act touchpoints and HST on rent where applicable.",
      },
      {
        code: "BC",
        name: "British Columbia",
        lawBlurb:
          "Residential: Residential Tenancy Act + RTB. Commercial: common-law lease with provincial property & GST/HST considerations.",
      },
      {
        code: "AB",
        name: "Alberta",
        lawBlurb:
          "Residential: Residential Tenancies Act. Commercial: common-law lease practice; GST on commercial rent typically applies.",
      },
      {
        code: "QC",
        name: "Quebec",
        lawBlurb:
          "Civil Code of Québec lease rules (residential + commercial nuances); French-language form requirements may apply — verify with Québec counsel.",
      },
      {
        code: "NS",
        name: "Nova Scotia",
        lawBlurb:
          "Residential: Residential Tenancies Act. Commercial: common-law lease; HST themes for commercial rent.",
      },
      {
        code: "MB",
        name: "Manitoba",
        lawBlurb:
          "Residential: Residential Tenancies Act. Commercial: common-law lease practice with GST where applicable.",
      },
    ],
  },
}

export function listJurisdictionCountries(): CountryJurisdiction[] {
  return [JURISDICTION_PRESETS.IN, JURISDICTION_PRESETS.CA]
}

export function getRegionPreset(
  country: JurisdictionCountry,
  regionCode: string,
): RegionPreset | null {
  const c = JURISDICTION_PRESETS[country]
  if (!c) return null
  return c.regions.find((r) => r.code.toUpperCase() === regionCode.toUpperCase()) ?? null
}

export function resolveLawNotes(country: JurisdictionCountry, regionCode: string): string {
  const region = getRegionPreset(country, regionCode)
  if (region) return region.lawBlurb
  return JURISDICTION_PRESETS[country]?.defaultLawBlurb ?? ""
}

export function parseCountry(raw: string | null | undefined): JurisdictionCountry | null {
  const v = String(raw ?? "")
    .trim()
    .toUpperCase()
  if (v === "IN" || v === "INDIA") return "IN"
  if (v === "CA" || v === "CANADA") return "CA"
  return null
}
