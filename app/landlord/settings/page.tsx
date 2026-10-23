import Link from "next/link"
import { PageHeader } from "@/components/product"
import { CurrencyForm } from "@/components/landlord/currency-form"
import { DomainSettings } from "@/components/landlord/domain-settings"
import { RazorpaySettings } from "@/components/landlord/razorpay-settings"
import { PhoneOtpForm } from "@/components/otp/phone-otp"
import { DataRightsPanel } from "@/components/privacy/data-rights"
import { InviteSeatForm } from "@/components/auth/invite-seat-form"
import {
  getShopSettingsPublic,
  getTenantPackage,
  listCustomDomains,
  listPendingInvites,
  listSeats,
  packageUsage,
} from "@/lib/db"
import { seatCapabilities, seatRoleLabel } from "@/lib/auth/seats"
import { packageHasCustomDomain, planLabel, subscribeHref } from "@/lib/plans"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord settings" }

export default async function LandlordSettingsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const packageTier = user.tenantPackage ?? getTenantPackage(user.tenantId)
  const domains = listCustomDomains(user.tenantId)
  const shopSettings = getShopSettingsPublic(user.tenantId)
  const hasDomain = packageHasCustomDomain(packageTier)
  const usage = packageUsage(user.tenantId)
  const seats = listSeats(user.tenantId)
  const invites = listPendingInvites(user.tenantId)
  const canInvite = seatCapabilities(user.seatRole)?.inviteSeats === true

  return (
    <div>
      <PageHeader
        kicker="Organisation"
        title="Settings, seats, and package"
        lede="Display currency, Razorpay shop keys, phone OTP demo, Pro custom domains, and teammate seats within your package limit."
      />

      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Subscription package</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Current plan:{" "}
          <span className="font-bold tracking-wide text-ink">{planLabel(packageTier)}</span>{" "}
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
            ({usage.packageId})
          </span>
          {hasDomain
            ? " — custom domains unlocked."
            : " — upgrade to Pro for a custom listings hostname."}{" "}
          Soft warn at 80%; hard block at 100% for new seats and properties.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3" data-testid="package-usage">
          <div className="border border-ink/10 p-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Properties
            </dt>
            <dd className="mt-1 font-heading text-2xl font-extrabold">
              {usage.properties.used}
              <span className="text-base text-ink-faint"> / {usage.properties.max}</span>
            </dd>
          </div>
          <div className="border border-ink/10 p-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Units
            </dt>
            <dd className="mt-1 font-heading text-2xl font-extrabold">
              {usage.units.used}
              <span className="text-base text-ink-faint"> (cap {usage.units.max}/property)</span>
            </dd>
          </div>
          <div className="border border-ink/10 p-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Seats
            </dt>
            <dd className="mt-1 font-heading text-2xl font-extrabold">
              {usage.seats.used}
              <span className="text-base text-ink-faint"> / {usage.seats.max}</span>
            </dd>
          </div>
        </dl>
        <Link
          href={subscribeHref(hasDomain ? "pro" : "growth", { from: "settings" })}
          className="mt-4 inline-block text-sm font-semibold text-terra hover:underline"
          data-testid="settings-change-plan"
        >
          Change plan on pricing
        </Link>
      </section>

      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Team seats</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Roles: owner, leasing manager, accountant, viewer. Duplicate email on this org is rejected.
        </p>
        <ul className="mt-4 divide-y divide-ink/10" data-testid="seat-list">
          {seats.map((seat) => (
            <li key={seat.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <div>
                <p className="font-semibold text-ink">{seat.name}</p>
                <p className="font-mono text-xs text-ink-faint">{seat.email}</p>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-terra">
                {seatRoleLabel(seat.seatRole)}
              </p>
            </li>
          ))}
        </ul>
        {invites.length > 0 ? (
          <div className="mt-4 border-t border-ink/10 pt-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Pending invites
            </h3>
            <ul className="mt-2 grid gap-2" data-testid="pending-invites">
              {invites.map((invite) => (
                <li key={invite.id} className="text-sm text-ink-soft">
                  {invite.email} · {seatRoleLabel(invite.seatRole)} ·{" "}
                  <span className="font-mono text-xs">/invite/{invite.token.slice(0, 8)}…</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {canInvite ? (
          <div className="mt-6 border-t border-ink/10 pt-6">
            <InviteSeatForm />
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-faint">Only an owner can send invites.</p>
        )}
      </section>

      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <DomainSettings packageTier={packageTier} domains={domains} />
      </section>
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <RazorpaySettings settings={shopSettings} />
      </section>
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Display currency</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Current preference: <span className="font-bold text-ink">{user.displayCurrency}</span>. When
          it is not INR, the ledger shows the converted figure and the INR charge.
        </p>
        <div className="mt-4">
          <CurrencyForm current={user.displayCurrency} />
        </div>
      </section>
      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Phone OTP (demo)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Country-code picker and E.164 validation. Demo send and verify — no SMS provider.
        </p>
        <div className="mt-4">
          <PhoneOtpForm currentPhone={user.phone} />
        </div>
      </section>
      <DataRightsPanel role={user.role} />
    </div>
  )
}
