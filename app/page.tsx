import { HomePage } from "@/components/marketing/home-page"
import { listPortfolio } from "@/lib/db"
import { sqft } from "@/lib/format"

export default function Page() {
  const portfolio = listPortfolio()
  const available = portfolio.reduce(
    (sum, property) => sum + property.units.filter((unit) => unit.status === "available").length,
    0,
  )
  const total = portfolio.reduce((sum, property) => sum + property.totalSqft, 0)
  const orgs = new Set(portfolio.map((property) => property.tenantId)).size

  return (
    <HomePage
      stats={{
        properties: portfolio.length,
        sqft: sqft(total).replace(" SF", ""),
        orgs,
        available,
      }}
      properties={portfolio.map((property) => ({
        slug: property.slug,
        name: property.name,
        cityLine: property.cityLine,
        address: property.address,
        landlord: property.tenantName,
        units: property.units.map((unit) => ({
          code: unit.code,
          sqft: unit.sqft,
          clearHeight: unit.clearHeight,
          docks: unit.docks,
          driveIns: unit.driveIns,
          power: unit.power,
          ratePsf: unit.ratePsf,
          status: unit.status,
        })),
      }))}
    />
  )
}
