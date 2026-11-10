import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import {
  consoleApproveComplianceFlag,
  consoleDisableComplianceFlag,
  consoleRejectComplianceFlag,
  consoleRequestEnableComplianceFlag,
} from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { INDIA_COMPLIANCE_PARKED } from "@/lib/markets/compliance-catalog"
import { dataResidencyDeclarative } from "@/lib/markets/enforce"
import {
  adminListConsoleCompliance,
  listComplianceAudit,
  listPendingComplianceProposals,
} from "@/lib/markets/legal-overrides"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Compliance · Command center" }

export default async function ConsoleCompliancePage() {
  await requirePlatformAdmin()
  const session = await getSessionUser()
  // Canada focus — CA rows first from adminListConsoleCompliance.
  const rows = adminListConsoleCompliance(["CA", "IN"])
  const pending = listPendingComplianceProposals().filter((p) =>
    INDIA_COMPLIANCE_PARKED ? p.iso !== "IN" : true,
  )
  const audit = listComplianceAudit(25)
  const residencyCa = dataResidencyDeclarative("CA")
  const residencyIn = dataResidencyDeclarative("IN")

  const byIso = {
    CA: rows.filter((r) => r.iso === "CA"),
    IN: rows.filter((r) => r.iso === "IN"),
  } as const

  return (
    <div data-testid="console-compliance">
      <PageHeader
        kicker="Canada focus · LEGAL / money / residency"
        title="Compliance toggles"
        lede="Canada is the active money surface. India money toggles stay OFF and are labelled parked. Defaults OFF; money enables need a distinct L0/L1 peer. Checkout / model / API still go through enforce*. dataResidency is declarative until storage pins regions. Open LEGAL/FINANCE/TECH questions held."
      />

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        {[
          { iso: "CA", r: residencyCa, focus: true },
          { iso: "IN", r: residencyIn, focus: false },
        ].map(({ iso, r, focus }) => (
          <article
            key={iso}
            className="border border-brand/15 bg-gradient-to-br from-brand/[0.05] to-terra/[0.08] p-4"
            data-testid={`data-residency-${iso}`}
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-terra">
              dataResidency · {iso} · declarative
              {!focus && INDIA_COMPLIANCE_PARKED ? " · India parked" : focus ? " · Canada focus" : ""}
            </p>
            <p className="mt-1 font-serif text-lg font-semibold text-brand">
              Region {r.region ?? "—"}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{r.notes ?? "No notes."}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              enforcedByStorage: false
            </p>
          </article>
        ))}
      </section>

      {(["CA", "IN"] as const).map((iso) => (
        <section key={iso} className="mb-10" data-testid={`compliance-iso-${iso}`}>
          <h2 className="mb-1 font-serif text-xl font-semibold text-brand">
            {iso === "CA" ? "Canada (focus)" : "India (parked)"} ({iso})
          </h2>
          {iso === "IN" && INDIA_COMPLIANCE_PARKED ? (
            <p className="mb-3 text-sm text-ink-soft" data-testid="india-parked-banner">
              India money / pay-plane toggles are parked and forced OFF. Canada is the live compliance
              focus. Non-money IN lease/AI rows may still be reviewed; money enables are blocked.
            </p>
          ) : (
            <p className="mb-3 text-sm text-ink-soft">
              Active money surface — peer approve required to enable money flags.
            </p>
          )}
          <div className="grid gap-3">
            {byIso[iso].map((row) => (
              <article
                key={`${row.iso}-${row.key}`}
                className="border border-brand/15 bg-card p-4"
                data-testid={`compliance-flag-${row.iso}-${row.key}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-semibold text-brand">{row.label}</h3>
                    <p className="text-sm text-ink-soft">{row.blurb}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {row.key}
                      {row.payPlane ? " · host-rail" : ""}
                      {row.money ? " · money" : ""}
                      {row.hardLocked ? " · hard-locked" : ""}
                      {row.indiaParked ? " · india-parked" : ""}
                      {" · "}
                      {row.effective ? "ON" : "OFF"}
                      {row.envMirror ? ` · env ${row.envMirror}` : ""}
                      {row.host ? ` · ${row.host}` : ""}
                    </p>
                    <ul className="mt-2 space-y-0.5">
                      {row.signOffs.map((s) => (
                        <li
                          key={`${row.key}-${s.role}-${s.needed}`}
                          className="font-mono text-[11px] text-ink-soft"
                        >
                          <span className="text-terra">{s.role}</span> sign-off needed: {s.needed}
                        </li>
                      ))}
                    </ul>
                    {row.pendingProposal ? (
                      <p className="mt-2 text-sm text-terra">
                        Pending peer approve · proposed by {row.pendingProposal.requestedBy}
                        {session?.id === row.pendingProposal.requestedBy
                          ? " (you — cannot self-approve)"
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.hardLocked ? (
                      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                        Locked OFF
                      </span>
                    ) : row.indiaParked ? (
                      <span
                        className="font-mono text-[11px] uppercase tracking-wider text-ink-faint"
                        data-testid={`india-parked-${row.key}`}
                      >
                        India parked · OFF
                      </span>
                    ) : row.pendingProposal ? (
                      <>
                        {session?.id !== row.pendingProposal.requestedBy ? (
                          <form action={consoleApproveComplianceFlag}>
                            <input type="hidden" name="proposalId" value={row.pendingProposal.id} />
                            <SubmitButton pendingLabel="…">Peer approve</SubmitButton>
                          </form>
                        ) : (
                          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                            Awaiting peer
                          </span>
                        )}
                        <form action={consoleRejectComplianceFlag}>
                          <input type="hidden" name="proposalId" value={row.pendingProposal.id} />
                          <SubmitButton variant="outline" pendingLabel="…">
                            Reject
                          </SubmitButton>
                        </form>
                      </>
                    ) : row.effective ? (
                      <form action={consoleDisableComplianceFlag}>
                        <input type="hidden" name="iso" value={row.iso} />
                        <input type="hidden" name="key" value={row.key} />
                        <SubmitButton variant="outline" pendingLabel="…">
                          Turn off
                        </SubmitButton>
                      </form>
                    ) : (
                      <form action={consoleRequestEnableComplianceFlag}>
                        <input type="hidden" name="iso" value={row.iso} />
                        <input type="hidden" name="key" value={row.key} />
                        <SubmitButton pendingLabel="…">
                          {row.money ? "Request enable" : "Turn on"}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="mb-10" data-testid="compliance-pending">
        <h2 className="mb-3 font-serif text-xl font-semibold text-brand">Pending money enables</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-soft">No open proposals.</p>
        ) : (
          <ul className="grid gap-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border border-brand/10 bg-card px-4 py-3"
              >
                <span className="font-mono text-sm">
                  {p.iso} · {p.flagKey} · by {p.requestedBy}
                </span>
                <div className="flex gap-2">
                  {session?.id !== p.requestedBy ? (
                    <form action={consoleApproveComplianceFlag}>
                      <input type="hidden" name="proposalId" value={p.id} />
                      <SubmitButton pendingLabel="…">Approve</SubmitButton>
                    </form>
                  ) : null}
                  <form action={consoleRejectComplianceFlag}>
                    <input type="hidden" name="proposalId" value={p.id} />
                    <SubmitButton variant="outline" pendingLabel="…">
                      Reject
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="compliance-audit">
        <h2 className="mb-3 font-serif text-xl font-semibold text-brand">Audit log</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-ink-soft">No compliance audit events yet.</p>
        ) : (
          <ul className="grid gap-1">
            {audit.map((e) => (
              <li key={e.id} className="font-mono text-[11px] text-ink-soft">
                {e.createdAt} · {e.iso} · {e.flagKey} · {e.action} · {e.summary}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
