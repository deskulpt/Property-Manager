import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import {
  consoleApproveComplianceFlag,
  consoleDisableComplianceFlag,
  consoleRecordCaslConsent,
  consoleRejectComplianceFlag,
  consoleRequestEnableComplianceFlag,
  consoleSaveOntarioPrivacy,
} from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import {
  GO_LIVE_BLOCKERS,
  INDIA_COMPLIANCE_PARKED,
  ONTARIO_GO_LIVE_BLOCKERS,
  TENANT_CARD_FEE_POLICY_LABEL,
} from "@/lib/markets/compliance-catalog"
import { dataResidencyDeclarative } from "@/lib/markets/enforce"
import { ONTARIO_TENANT_CARD_FEE } from "@/lib/markets/ontario-rta"
import {
  getOntarioPrivacyLead,
  getOntarioRetentionRule,
  listOntarioBreaches,
} from "@/lib/markets/ontario-privacy"
import {
  adminListConsoleCompliance,
  listComplianceAudit,
  listPendingComplianceProposals,
} from "@/lib/markets/legal-overrides"
import { getSessionUser } from "@/lib/session"

const ONTARIO_PRIVACY_TENANT = "t_platform_ca"

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
  const privacyLead = getOntarioPrivacyLead(ONTARIO_PRIVACY_TENANT)
  const retention = getOntarioRetentionRule(ONTARIO_PRIVACY_TENANT)
  const breaches = listOntarioBreaches(ONTARIO_PRIVACY_TENANT)

  const byIso = {
    CA: rows.filter((r) => r.iso === "CA"),
    IN: rows.filter((r) => r.iso === "IN"),
  } as const

  return (
    <div data-testid="console-compliance">
      <PageHeader
        kicker="Canada/Ontario Stripe first demo · India demo only · payments OFF"
        title="Compliance toggles"
        lede="Demo/staging only — no global go-live. India demo only; production pending documented country/state/feature gates. Money enables need a distinct L0/L1 peer (24h expiry, no self-approval). Kill-switch OFF is instant. Deposit holding hard OFF (Aloke Nov10). Rent collect OFF at launch. Commercial flag OFF until counsel. dataResidency: target vs actual unverified — not a compliance badge."
      />

      <section className="mb-8" data-testid="go-live-blockers">
        <h2 className="mb-2 font-serif text-xl font-semibold text-brand">Go-live blockers</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Unchecked until counsel / ops close them outside this console. Do not mark done here.
        </p>
        <ul className="grid gap-2">
          {GO_LIVE_BLOCKERS.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 border border-brand/15 bg-card px-4 py-3"
              data-testid="go-live-blocker"
            >
              <input
                type="checkbox"
                checked={false}
                disabled
                readOnly
                aria-checked="false"
                className="mt-1"
              />
              <span className="text-sm text-ink">{item}</span>
            </li>
          ))}
        </ul>
      </section>

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
              dataResidency · {iso} · demo declaration
              {!focus && INDIA_COMPLIANCE_PARKED ? " · India parked" : focus ? " · Canada focus" : ""}
            </p>
            <p className="mt-2 text-sm text-ink">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                Target location
              </span>
              <br />
              <span className="font-serif text-lg font-semibold text-brand">
                {r.targetLocation ?? "—"}
              </span>
            </p>
            <p className="mt-2 text-sm text-ink" data-testid={`actual-location-${iso}`}>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                Actual location
              </span>
              <br />
              <span className="font-serif text-lg font-semibold text-ink-soft">unverified</span>
            </p>
            <p className="mt-2 text-sm text-ink-soft">{r.notes ?? "No notes."}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              enforcedByStorage: false · not a compliance badge
            </p>
          </article>
        ))}
      </section>

      <section className="mb-8" data-testid="ontario-go-live-blockers">
        <h2 className="mb-2 font-serif text-xl font-semibold text-brand">
          Ontario go-live blockers (unchecked)
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          Demo/staging only — counsel sign-off required before go-live. Do not mark these done here.
        </p>
        <ul className="grid gap-2">
          {ONTARIO_GO_LIVE_BLOCKERS.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 border border-brand/15 bg-card px-3 py-2 text-sm"
              data-testid={`go-live-blocker-${item.id}`}
            >
              <input type="checkbox" disabled checked={false} aria-label={item.label} className="mt-1" />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-[11px] text-ink-faint" data-testid="ontario-card-fee-policy">
          Tenant card fee: {ONTARIO_TENANT_CARD_FEE.label}
        </p>
      </section>

      <section className="mb-8" data-testid="ontario-pipeda-casl">
        <h2 className="mb-2 font-serif text-xl font-semibold text-brand">
          Ontario PIPEDA / CASL
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          Privacy lead, retention/deletion, breach register (24 months), CASL marketing consent.
          Demo/staging — synthetic data only; real PII blocked from AI connectors while flag OFF.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            action={consoleSaveOntarioPrivacy}
            className="grid gap-2 border border-brand/15 bg-card p-4"
          >
            <input type="hidden" name="tenantId" value={ONTARIO_PRIVACY_TENANT} />
            <p className="font-mono text-[10px] uppercase tracking-wider text-terra">Privacy lead</p>
            <label className="grid gap-1 text-sm">
              Name
              <input
                name="privacyLeadName"
                required
                defaultValue={privacyLead?.name ?? ""}
                className="h-9 border border-ink/15 bg-paper px-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Email
              <input
                name="privacyLeadEmail"
                type="email"
                required
                defaultValue={privacyLead?.email ?? ""}
                className="h-9 border border-ink/15 bg-paper px-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Retention months
              <input
                name="retentionMonths"
                type="number"
                min={1}
                defaultValue={retention.retentionMonths}
                className="h-9 border border-ink/15 bg-paper px-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Deletion policy
              <textarea
                name="deletionPolicy"
                rows={3}
                defaultValue={retention.deletionPolicy}
                className="border border-ink/15 bg-paper px-2 py-1 text-sm"
              />
            </label>
            <SubmitButton pendingLabel="Saving…">Save privacy lead / retention</SubmitButton>
          </form>
          <div className="grid gap-3">
            <article className="border border-brand/15 bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-terra">
                Breach register · retain {24} months
              </p>
              {breaches.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">No breach records in retention window.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {breaches.map((b) => (
                    <li key={b.id}>
                      {b.recordedAt.slice(0, 10)} · {b.summary}
                      {b.synthetic ? " · synthetic" : ""}
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <form
              action={consoleRecordCaslConsent}
              className="grid gap-2 border border-brand/15 bg-card p-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-terra">
                CASL marketing consent
              </p>
              <label className="grid gap-1 text-sm">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  className="h-9 border border-ink/15 bg-paper px-2 text-sm"
                />
              </label>
              <input type="hidden" name="granted" value="1" />
              <SubmitButton pendingLabel="Recording…">Record consent</SubmitButton>
            </form>
          </div>
        </div>
      </section>

      {(["CA", "IN"] as const).map((iso) => (
        <section key={iso} className="mb-10" data-testid={`compliance-iso-${iso}`}>
          <h2 className="mb-1 font-serif text-xl font-semibold text-brand">
            {iso === "CA" ? "Canada (focus)" : "India (parked)"} ({iso})
          </h2>
          {iso === "IN" && INDIA_COMPLIANCE_PARKED ? (
            <p className="mb-3 text-sm text-ink-soft" data-testid="india-parked-banner">
              India money / pay-plane is parked and forced OFF with no enable path. Canada is the
              live compliance focus. Non-money IN lease/AI rows may still be reviewed.
            </p>
          ) : (
            <p className="mb-3 text-sm text-ink-soft">
              Active money surface — peer approve required to enable; kill-switch OFF is instant.
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
                    {row.hardLocked ? (
                      <p
                        className="mt-2 text-sm text-terra"
                        data-testid="tenant-card-fee-policy"
                      >
                        {TENANT_CARD_FEE_POLICY_LABEL}. Changing requires counsel review + code
                        release — not a toggle.
                      </p>
                    ) : null}
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
                        {" · expires 24h after propose"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.hardLocked ? (
                      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                        Locked OFF · policy
                      </span>
                    ) : row.indiaParked ? (
                      <span
                        className="font-mono text-[11px] uppercase tracking-wider text-ink-faint"
                        data-testid={`india-parked-${row.key}`}
                      >
                        India parked · OFF · no enable
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
                          {row.money ? "Kill switch off" : "Turn off"}
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
        <p className="mb-3 text-sm text-ink-soft">
          Approvals expire after 24 hours. Self-approval is blocked. Both admins are alerted on every
          change.
        </p>
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
                  {p.iso} · {p.flagKey} · by {p.requestedBy} · {p.createdAt}
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

      <section className="mb-10" data-testid="compliance-audit-export">
        <h2 className="mb-3 font-serif text-xl font-semibold text-brand">Audit export (CSV)</h2>
        <p className="mb-3 text-sm text-ink-soft">
          UTF-8 · UTC timestamps · plain decimal amount + currency · tax column · append-only.
          Export footer includes row count and sha256 hash.
        </p>
        <form
          className="flex flex-wrap items-end gap-3"
          method="get"
          action="/api/console/compliance/audit"
        >
          <label className="grid gap-1 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              From (UTC)
            </span>
            <input
              type="datetime-local"
              name="from"
              className="border border-brand/20 bg-card px-2 py-1 font-mono text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              To (UTC)
            </span>
            <input
              type="datetime-local"
              name="to"
              className="border border-brand/20 bg-card px-2 py-1 font-mono text-sm"
            />
          </label>
          <button
            type="submit"
            className="border border-brand/30 bg-brand px-4 py-2 text-sm text-white"
            data-testid="audit-export-submit"
          >
            Download CSV
          </button>
        </form>
      </section>

      <section data-testid="compliance-audit">
        <h2 className="mb-3 font-serif text-xl font-semibold text-brand">Audit log</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-ink-soft">No compliance audit events yet.</p>
        ) : (
          <ul className="grid gap-1">
            {audit.map((e) => (
              <li key={e.id} className="font-mono text-[11px] text-ink-soft">
                {e.createdAt} · {e.iso} · {e.flagKey} · {e.action}
                {e.actorUserId ? ` · actor ${e.actorUserId}` : ""}
                {e.peerUserId ? ` · approver ${e.peerUserId}` : ""} · {e.summary}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
