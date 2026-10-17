import Link from "next/link"
import { getPartnerApplication } from "@/lib/partners/store"

export const metadata = { title: "Application status" }

export default async function PartnerStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; email?: string }>
}) {
  const sp = await searchParams
  const app = sp.id ? getPartnerApplication(sp.id) : null
  return (
    <div className="mx-auto max-w-[720px] px-4 py-12 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">Your application</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Status</h1>
      <p className="mt-4 border border-terra/30 bg-terra/5 px-3 py-2 text-xs text-ink-soft">
        Identity checks are simulated for demo — not a live government verification.
      </p>
      {!app ? (
        <p className="mt-8 text-ink-soft">
          No application found.{" "}
          <Link href="/partners" className="text-terra underline">
            Partner hub
          </Link>
        </p>
      ) : (
        <article className="mt-8 border border-ink/15 bg-card p-6">
          <h2 className="font-serif text-2xl font-semibold">{app.name}</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-faint">
            {app.track} · {app.subtype}
          </p>
          <dl className="mt-6 grid gap-3 text-sm">
            <div>
              <dt className="text-ink-faint">Status</dt>
              <dd className="font-semibold text-brand">{app.status}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Demo ID check</dt>
              <dd>{app.idCheckResult}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Demand OK</dt>
              <dd>{app.demandOk ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Catchments</dt>
              <dd>
                {app.areas.length === 0
                  ? "None yet"
                  : app.areas
                      .map((a) =>
                        [a.citySlug, a.pinPrefix ? `PIN ${a.pinPrefix}*` : null, a.radiusKm != null ? `${a.radiusKm} km` : null]
                          .filter(Boolean)
                          .join(" · "),
                      )
                      .join("; ")}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-ink-faint">
            PAN / Aadhaar details are hidden here for privacy — staff see them only in CMS.
          </p>
        </article>
      )}
    </div>
  )
}
