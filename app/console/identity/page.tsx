import { PageHeader } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { kycAdapterStatus, otpAdapterStatus } from "@/lib/platform-ops"

export const metadata = { title: "KYC / OTP · Command center" }

export default async function ConsoleIdentityPage() {
  await requirePlatformAdmin()
  const rows = [...otpAdapterStatus(), ...kycAdapterStatus()]

  return (
    <div data-testid="console-identity">
      <PageHeader
        kicker="Identity ops"
        title="KYC & OTP adapters"
        lede="Honest status from env + provider resolvers. Live SMS/KYC needs vendor keys and OTP_LIVE / webhook secrets — not seeker SKUs."
      />
      <div className="grid gap-3">
        {rows.map((row) => (
          <article key={row.id} className="border border-brand/15 bg-card p-4" data-testid={`identity-${row.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-brand">{row.label}</h2>
              <span className="font-mono text-[11px] uppercase tracking-wider text-terra">{row.mode}</span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{row.detail}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Env: {row.envHints.join(" · ")}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
