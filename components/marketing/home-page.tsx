import Link from "next/link"
import { Motion } from "@/components/marketing/motion"
import { LeasingMap, type MapProperty } from "@/components/map/leasing-map"

export function HomePage({
  properties,
  stats,
}: {
  properties: MapProperty[]
  stats: { properties: number; sqft: string; orgs: number; available: number }
}) {
  return (
    <Motion>
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(27,29,28,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(27,29,28,0.12)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(circle_at_50%_20%,#000,transparent_78%)]" />
      <section className="mx-auto max-w-[1200px] px-4 pt-16 pb-12 md:px-8 md:pt-24">
        <p className="hero-rise font-mono text-[12px] uppercase tracking-[0.22em] text-terra">Open-source leasing platform</p>
        <h1 className="hero-rise mt-6 max-w-[14ch] text-[clamp(2.7rem,8vw,6.4rem)] leading-[1.02] font-black tracking-[-0.035em]">
          A digital headquarters for <em className="font-serif font-light text-terra italic">industrial</em> real estate.
        </h1>
        <p className="hero-rise mt-6 max-w-[58ch] text-xl font-light text-ink-soft md:text-2xl">
          DeSkulpt is the map-driven desk behind Indian industrial parks — live bays in INR, UPI and eNACH demo payments, GST on the rent roll, and a concierge board for trades. Seeded landlord organisations keep the books separate; NRI landlords can view amounts in USD, CAD, or GBP.
        </p>
        <dl className="hero-rise mt-10 grid grid-cols-2 border border-ink/25 bg-paper-2 md:grid-cols-4">
          {[
            [String(stats.properties), "Buildings in the demo"],
            [stats.sqft, "Square feet on file"],
            [String(stats.orgs), "Landlord organisations"],
            [String(stats.available), "Bays you can apply for"],
          ].map(([value, label]) => (
            <div key={label} className="border-ink/15 border-r border-b px-4 py-5 last:border-r-0 md:border-b-0">
              <dt className="font-sans text-3xl font-black tracking-tight text-brand md:text-4xl">{value}</dt>
              <dd className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="context" className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">01 — The opportunity</p>
        <h2 className="reveal mt-4 max-w-[18ch] text-4xl font-black md:text-5xl">Today, a great portfolio sits behind a brochure.</h2>
        <p className="reveal mt-4 max-w-[62ch] text-lg font-light text-ink-soft">
          BBM Logistics Parks and Harbourline Yards India run quality industrial space across Bhiwandi, Whitefield, and Sriperumbudur — and the old pattern is familiar: availabilities stuck on “Coming Soon,” every lead in one WhatsApp thread, tenants with no way to transact. Prospects can’t see a bay. Staff manage the rest by hand. The desk below closes that gap, and it hosts more than one landlord.
        </p>
        <div className="reveal mt-10 grid border border-ink/25 md:grid-cols-2">
          <div className="bg-paper-2 p-6 md:p-9">
            <h3 className="font-mono text-xs font-bold tracking-[0.14em] text-terra-dark uppercase">Where the site is now</h3>
            <ul className="mt-4">
              {[
                "Static brochure; availabilities shown as “Coming Soon”",
                "Every lead funnels into one email — no qualification, no tracking",
                "No way to view unit specs, square footage, or dock and power detail online",
                "No accounts, online applications, or rent ledger",
                "Maintenance handled ad hoc by phone",
              ].map((item) => (
                <li key={item} className="flex gap-3 border-b border-black/10 py-3 text-[15px] last:border-b-0">
                  <span className="font-mono text-sm font-bold text-leased">×</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-brand p-6 text-paper md:p-9">
            <h3 className="font-mono text-xs font-bold tracking-[0.14em] text-[#E2A57E] uppercase">Where DeSkulpt takes it</h3>
            <ul className="mt-4">
              {[
                "Interactive footprints with live, unit-level availability",
                "Spec sheets, a rich media bay, and an online application",
                "Applicant desk: status, demo verification, rent ledger",
                "Landlord desk for approvals, floor plans, and concierge jobs",
                "Trades who are verified, area-matched, and approved before they are assigned",
              ].map((item) => (
                <li key={item} className="flex gap-3 border-b border-white/15 py-3 text-[15px] last:border-b-0">
                  <span className="font-mono text-sm font-bold text-avail">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-8 md:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">02 — Platform pillars</p>
        <h2 className="reveal mt-4 text-4xl font-black md:text-5xl">Three audiences, one connected system.</h2>
        <div className="reveal mt-8 grid gap-px bg-ink/20 md:grid-cols-3">
          {[
            ["P—01", "Prospects find space", "A map-first public site where companies explore buildings, inspect a bay, and apply without a phone call."],
            ["P—02", "Applicants stay in the loop", "The same person tracks the application, walks a demo verification, and sees rent, late fees, and payments."],
            ["P—03", "Landlords run the portfolio", "Approvals, floor-plan hotspots, late-fee rules, and concierge jobs — scoped to one organisation at a time."],
          ].map(([num, title, body]) => (
            <article key={num} className="bg-paper p-7">
              <p className="font-mono text-xs tracking-widest text-terra">{num}</p>
              <h3 className="mt-3 text-2xl font-extrabold">{title}</h3>
              <p className="mt-2 font-light text-ink-soft">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="map" className="bg-brand py-16 text-paper">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">03 — The centrepiece</p>
          <h2 className="reveal mt-4 max-w-[16ch] text-4xl font-black text-paper md:text-5xl">Select a building. Click a unit. See everything.</h2>
          <p className="reveal mt-4 max-w-[62ch] text-lg font-light text-paper/75">
            A working preview of the leasing map. Vacant bays stay bright, leased bays dim. The numbers are the seeded India portfolio — BBM Logistics Parks, Harbourline Yards India, and Sahni Global Realty (NRI) — not a static mock. <span className="text-[#E2A57E]">Open a bay to apply.</span>
          </p>
          <div className="reveal">
            <LeasingMap properties={properties} />
          </div>
        </div>
      </section>

      <section id="tenant" className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">04 — Applicant experience</p>
        <h2 className="reveal mt-4 max-w-[16ch] text-4xl font-black md:text-5xl">From applicant to occupant, online.</h2>
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          <ol className="reveal">
            {[
              ["01", "Demo identity, not a password", "Pick Maya Chen or Devon Hale in the header. There is no auth provider and no secret."],
              ["02", "Online applications", "Company, use, and a note. The landlord sees it in an inbox scoped to their organisation."],
              ["03", "Rent ledger", "Due rent, GST (18%), a late fee after grace, and a demo UPI or eNACH payment. No bank is contacted."],
              ["04", "Verification wizard", "Defaults to India / Aadhaar. Other countries use a driving licence. Face match is simulated."],
              ["05", "Notices", "An in-app inbox. Email, web push, and WhatsApp are logged by a demo sender."],
            ].map(([num, title, body]) => (
              <li key={num} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-black/10 py-4">
                <span className="font-mono text-xs font-bold text-terra">{num}</span>
                <div>
                  <h3 className="font-sans text-lg font-bold">{title}</h3>
                  <p className="text-[15px] font-light text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="reveal overflow-hidden border border-ink/20 bg-white shadow-[0_24px_60px_-28px_rgba(27,29,28,.35)]">
            <div className="flex items-center gap-2 border-b border-black/10 bg-paper-3 px-4 py-3">
              <i className="size-2.5 rounded-full bg-black/20" />
              <i className="size-2.5 rounded-full bg-black/20" />
              <i className="size-2.5 rounded-full bg-black/20" />
              <span className="ml-2 font-mono text-[11px] text-ink-faint">desk.deskulpt / account</span>
            </div>
            <div className="grid gap-3 p-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Due", "Open rent + GST"],
                  ["1", "Late fee"],
                  ["Demo", "eNACH on file"],
                ].map(([n, l]) => (
                  <div key={l} className="border border-black/10 bg-paper-2 p-3">
                    <div className="font-sans text-xl font-black text-brand">{n}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{l}</div>
                  </div>
                ))}
              </div>
              {[
                ["June rent · Unit A1", "Paid"],
                ["September rent", "Due"],
                ["Late fee", "Due"],
              ].map(([label, pill]) => (
                <div key={label} className="flex items-center justify-between border border-black/10 bg-paper-2 px-3 py-2 text-sm">
                  <span>{label}</span>
                  <span className="font-mono text-[10px] uppercase">{pill}</span>
                </div>
              ))}
              <Link href="/account/payments" className="font-sans text-sm font-bold text-brand">Open the ledger →</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="admin" className="bg-brand py-16 text-paper">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 md:px-8 lg:grid-cols-2">
          <div className="reveal overflow-hidden border border-white/20 bg-white text-ink shadow-[0_24px_60px_-28px_rgba(0,0,0,.45)]">
            <div className="flex items-center gap-2 border-b border-black/10 bg-paper-3 px-4 py-3">
              <i className="size-2.5 rounded-full bg-black/20" />
              <span className="ml-2 font-mono text-[11px] text-ink-faint">landlord desk / overview</span>
            </div>
            <div className="grid gap-3 p-5">
              <div className="grid grid-cols-3 gap-2">
                {[["94%", "A sample occupancy"], ["Rent roll", "From leased bays"], ["Inbox", "Live applications"]].map(([n, l]) => (
                  <div key={l} className="border border-black/10 bg-paper-2 p-3">
                    <div className="font-sans text-lg font-black text-brand">{n}</div>
                    <div className="font-mono text-[10px] uppercase text-ink-faint">{l}</div>
                  </div>
                ))}
              </div>
              <div className="flex h-20 items-end gap-2">
                {[55, 68, 60, 80, 72, 92].map((height) => (
                  <div key={height} className="flex-1 bg-brand" style={{ height: `${height}%` }} />
                ))}
              </div>
              <Link href="/landlord" className="font-sans text-sm font-bold text-brand">Enter the landlord desk →</Link>
            </div>
          </div>
          <div>
            <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">05 — Management backend</p>
            <h2 className="reveal mt-4 text-4xl font-black text-paper md:text-5xl">One dashboard to run the portfolio.</h2>
            <ul className="reveal mt-6">
              {[
                ["01", "Application review", "Approve or deny. Approval leases the bay and posts the next rent."],
                ["02", "Late fees and the ledger", "Grace days, a flat fee, and a percent. The assessment pass is real arithmetic."],
                ["03", "Floor plans", "Upload an image and place bays. The public plan uses the same coordinates."],
                ["04", "Concierge jobs", "Assign an approved trade in that building’s area. They accept and complete."],
              ].map(([num, title, body]) => (
                <li key={num} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-white/15 py-4">
                  <span className="font-mono text-xs font-bold text-terra">{num}</span>
                  <div>
                    <h3 className="font-sans text-lg font-bold text-paper">{title}</h3>
                    <p className="text-[15px] font-light text-paper/70">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">06 — Going further</p>
        <h2 className="reveal mt-4 text-4xl font-black md:text-5xl">What this slice already does.</h2>
        <div className="reveal mt-8 grid gap-px bg-black/10 md:grid-cols-3">
          {[
            ["F—01", "Unit media", "Stills, a GIF, video, a 360 photo in Pannellum, and a Matterport iframe slot on Unit B1."],
            ["F—02", "Floor-plan hotspots", "Click a pin on the public plan and land on that bay."],
            ["F—03", "Demo verification", "Aadhaar for India, a driving licence elsewhere. Simulated match only."],
            ["F—04", "Service providers", "Electricians, plumbers, couriers, cleaning. Approved per landlord, filtered by area."],
            ["F—05", "Payments interface", "Late-fee rules, GST, and a demo UPI / eNACH adapter. NRI landlords can display USD, CAD, or GBP."],
            ["F—06", "Installable PWA", "A manifest, a service worker, and an inbox with demo email, push, and WhatsApp logs."],
          ].map(([num, title, body]) => (
            <article key={num} className="bg-paper p-6">
              <p className="font-mono text-[11px] tracking-widest text-terra">{num}</p>
              <h3 className="mt-3 font-sans text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm font-light text-ink-soft">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-brand py-16 text-paper">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">07 — Architecture</p>
          <h2 className="reveal mt-4 text-4xl font-black md:text-5xl">A stack you can run without a secret.</h2>
          <p className="reveal mt-4 max-w-[62ch] font-light text-paper/75">
            Next.js, Tailwind, shadcn/ui, GSAP, Zod, and SQLite on the machine. Tenant id sits on every private row. Public bay pages are read without the session. Notifications go through a queue interface. Payments go through a provider interface. Redis, Kafka, and live processors are deliberately absent.
          </p>
          <div className="reveal mt-8 flex flex-wrap gap-2">
            {["Next.js", "TypeScript", "Tailwind", "shadcn/ui", "GSAP", "SQLite", "Zod", "Pannellum", "PWA"].map((chip) => (
              <span key={chip} className="rounded-full border border-white/25 px-4 py-2 font-mono text-xs text-paper/85">{chip}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="mx-auto max-w-[1200px] px-4 py-20 text-center md:px-8">
        <p className="reveal font-mono text-[12px] uppercase tracking-[0.22em] text-terra">Next step</p>
        <h2 className="reveal mx-auto mt-4 max-w-[18ch] text-4xl font-black md:text-6xl">
          Walk the portfolio the way a <em className="font-serif font-light text-terra italic">prospect</em> would.
        </h2>
        <div className="reveal mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/properties/waterman/units/B1" className="bg-terra px-6 py-4 font-sans text-sm font-bold text-white">Open Unit B1</Link>
          <Link href="/landlord" className="bg-brand px-6 py-4 font-sans text-sm font-bold text-paper">Landlord desk</Link>
          <Link href="/provider" className="border border-ink/30 px-6 py-4 font-sans text-sm font-bold">Provider desk</Link>
        </div>
      </section>
    </Motion>
  )
}
