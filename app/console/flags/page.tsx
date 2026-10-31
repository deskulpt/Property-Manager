import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { consoleSetOpsFlag } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { listOpsFlags } from "@/lib/platform-ops"

export const metadata = { title: "Flags · Command center" }

export default async function ConsoleFlagsPage() {
  await requirePlatformAdmin()
  const flags = listOpsFlags()

  return (
    <div data-testid="console-flags">
      <PageHeader
        kicker="Ops"
        title="Feature flags"
        lede="Durable toggles in the meta table. Env secrets (OTP_LIVE, ESIGN_LIVE, billing keys) stay env-only — shown on identity / eSign / billing desks."
      />
      <div className="grid gap-3">
        {flags.map((flag) => (
          <article
            key={flag.key}
            className="flex flex-wrap items-center justify-between gap-3 border border-brand/15 bg-card p-4"
            data-testid={`flag-${flag.key}`}
          >
            <div>
              <h2 className="font-serif text-lg font-semibold text-brand">{flag.label}</h2>
              <p className="text-sm text-ink-soft">{flag.blurb}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                {flag.key} · {flag.on ? "on" : "off"}
              </p>
            </div>
            <form action={consoleSetOpsFlag}>
              <input type="hidden" name="key" value={flag.key} />
              <input type="hidden" name="on" value={flag.on ? "0" : "1"} />
              <SubmitButton variant={flag.on ? "outline" : undefined} pendingLabel="…">
                {flag.on ? "Turn off" : "Turn on"}
              </SubmitButton>
            </form>
          </article>
        ))}
      </div>
    </div>
  )
}
