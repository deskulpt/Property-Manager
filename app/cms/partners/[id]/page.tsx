import Link from "next/link"
import { notFound } from "next/navigation"
import { EmptyState, PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  submitPartnerAdvance,
  submitPartnerAreas,
  submitPartnerDemand,
  submitPartnerIdCheck,
  submitPartnerNotes,
} from "@/lib/partners/actions"
import { PARTNER_STATUSES } from "@/lib/partners/types"
import { getPartnerApplication } from "@/lib/partners/store"
import { canOpenCms } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Partner application" }

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (
    !user ||
    !canOpenCms(user.role) ||
    !["super_admin", "account_manager", "service_manager"].includes(user.role)
  ) {
    return (
      <EmptyState
        title="Staff only"
        body="Sign in as Avery, Sam, or Priya — or impersonate from the L0 sticky bar."
        action={{ href: "/login?next=/cms/partners", label: "Log in" }}
      />
    )
  }
  const { id } = await params
  const app = getPartnerApplication(id)
  if (!app) notFound()

  return (
    <div>
      <PageHeader kicker={app.track} title={app.name} lede={`${app.subtype} · ${app.email} · ${app.phone}`} />
      <p className="mb-4 text-sm">
        <Link href="/cms/partners/queue" className="text-terra underline">
          ← Queue
        </Link>
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-semibold">Status & demo ID</h2>
          <p className="font-mono text-sm uppercase">
            {app.status} · id_check={app.idCheckResult} · demand_ok={app.demandOk ? "1" : "0"}
          </p>
          <form action={submitPartnerAdvance} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={app.id} />
            <select name="to" className="h-9 border border-input bg-background px-2 text-sm">
              {PARTNER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <SubmitButton pendingLabel="…">Set status</SubmitButton>
          </form>
          <form action={submitPartnerIdCheck} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={app.id} />
            <select name="result" className="h-9 border border-input bg-background px-2 text-sm">
              <option value="pending">pending</option>
              <option value="demo_verified">demo_verified</option>
              <option value="demo_failed">demo_failed</option>
            </select>
            <SubmitButton variant="outline" pendingLabel="…">
              Set demo ID
            </SubmitButton>
          </form>
          <form action={submitPartnerDemand}>
            <input type="hidden" name="id" value={app.id} />
            <input type="hidden" name="demandOk" value={app.demandOk ? "0" : "1"} />
            <SubmitButton variant="outline" pendingLabel="…">
              {app.demandOk ? "Clear demand_ok" : "Mark demand_ok"}
            </SubmitButton>
          </form>
          <dl className="mt-2 grid gap-1 text-sm text-ink-soft">
            <div>PAN: {app.pan ?? "—"}</div>
            <div>Aadhaar last4: {app.aadhaarLast4 ?? "—"}</div>
            <div>GSTIN: {app.gstin ?? "—"}</div>
            <div>Licence: {app.licenceRef ?? "—"}</div>
            <div>Docs: {app.docsJson}</div>
          </dl>
        </section>

        <section className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-semibold">Areas</h2>
          <ul className="text-sm text-ink-soft">
            {app.areas.map((a) => (
              <li key={a.id}>
                {[a.citySlug, a.pinPrefix ? `PIN ${a.pinPrefix}*` : null, a.radiusKm != null ? `${a.radiusKm}km` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </li>
            ))}
          </ul>
          <form action={submitPartnerAreas} className="grid gap-2">
            <input type="hidden" name="id" value={app.id} />
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label htmlFor="citySlug">City</Label>
                <Input id="citySlug" name="citySlug" defaultValue={app.areas[0]?.citySlug ?? ""} />
              </div>
              <div>
                <Label htmlFor="pinPrefix">PIN prefix</Label>
                <Input id="pinPrefix" name="pinPrefix" defaultValue={app.areas[0]?.pinPrefix ?? ""} />
              </div>
              <div>
                <Label htmlFor="radiusKm">Radius km</Label>
                <Input
                  id="radiusKm"
                  name="radiusKm"
                  type="number"
                  defaultValue={app.areas[0]?.radiusKm ?? 25}
                />
              </div>
            </div>
            <SubmitButton variant="outline" pendingLabel="…">
              Replace areas
            </SubmitButton>
          </form>
          <form action={submitPartnerNotes} className="grid gap-2">
            <input type="hidden" name="id" value={app.id} />
            <Label htmlFor="notes">Staff notes</Label>
            <Textarea id="notes" name="notes" defaultValue={app.notesStaff} rows={4} />
            <SubmitButton variant="outline" pendingLabel="…">
              Save notes
            </SubmitButton>
          </form>
        </section>
      </div>
    </div>
  )
}
