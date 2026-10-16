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
      {/* Full-bleed blueprint atmosphere — first viewport is one composition */}
      <section className="relative isolate overflow-hidden border-b border-ink/10">
        <div
          className="blueprint-grid pointer-events-none absolute inset-0 -z-10 opacity-70"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_0%,rgb(14_110_140/0.14),transparent_55%),radial-gradient(ellipse_at_90%_40%,rgb(19_37_58/0.08),transparent_50%)]"
          aria-hidden
        />
        <div className="mx-auto grid min-h-[min(72vh,640px)] max-w-[1200px] items-end gap-10 px-4 pb-14 pt-16 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pb-20 md:pt-24">
          <div>
            <p className="hero-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Easy Rental"
                width={480}
                height={270}
                className="h-14 w-auto object-contain md:h-20"
              />
            </p>
            <h1 className="hero-rise mt-5 max-w-[22ch] font-serif text-2xl font-medium leading-snug tracking-tight text-ink md:text-3xl">
              Industrial bays, mapped and leased online.
            </h1>
            <p className="hero-rise mt-4 max-w-[40ch] text-base leading-relaxed text-ink-soft md:text-lg">
              A leasing desk for warehouses and yards — live availability, applications, and landlord
              books in one place.
            </p>
            <div className="hero-rise mt-8 flex flex-wrap gap-3">
              <Link
                href="/listings"
                className="bg-brand px-5 py-3 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-brand-deep"
              >
                Browse listings
              </Link>
              <Link
                href="/#map"
                className="border border-ink/25 bg-paper/80 px-5 py-3 text-sm font-semibold tracking-wide text-ink transition-colors hover:border-terra hover:text-terra"
              >
                Open the map
              </Link>
            </div>
          </div>
          <Link
            href="/properties/waterman/units/B1"
            className="hero-rise group relative hidden overflow-hidden border border-ink/15 md:block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/gen-exterior.jpg"
              alt="BBM logistics park exterior"
              className="aspect-[4/3] h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-brand/80 px-4 py-3 text-sm text-paper">
              Featured · Unit B1 walkthrough
            </span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-12 md:px-8">
        <dl className="reveal grid grid-cols-2 border border-ink/20 bg-paper-2 md:grid-cols-4">
          {[
            [String(stats.properties), "Buildings in the demo"],
            [stats.sqft, "Square feet on file"],
            [String(stats.orgs), "Landlord organisations"],
            [String(stats.available), "Bays you can apply for"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="border-ink/15 border-r border-b px-4 py-5 last:border-r-0 md:border-b-0"
            >
              <dt className="font-serif text-3xl font-semibold tracking-tight text-brand md:text-4xl">
                {value}
              </dt>
              <dd className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {label}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="context" className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
          01 — The opportunity
        </p>
        <h2 className="reveal mt-4 max-w-[18ch] font-serif text-3xl font-semibold md:text-4xl">
          Today, a great portfolio sits behind a brochure.
        </h2>
        <p className="reveal mt-4 max-w-[62ch] text-lg text-ink-soft">
          BBM Logistics Parks and Harbourline Yards India run quality industrial space across
          Bhiwandi, Whitefield, and Sriperumbudur — and the old pattern is familiar: availabilities
          stuck on “Coming Soon,” every lead in one WhatsApp thread, tenants with no way to
          transact. Easy Rental closes that gap for more than one landlord.
        </p>
        <div className="reveal mt-10 grid border border-ink/20 md:grid-cols-2">
          <div className="bg-paper-2 p-6 md:p-9">
            <h3 className="font-mono text-xs font-bold tracking-[0.14em] text-terra-dark uppercase">
              Where the site is now
            </h3>
            <ul className="mt-4">
              {[
                "Static brochure; availabilities shown as “Coming Soon”",
                "Every lead funnels into one email — no qualification, no tracking",
                "No way to view unit specs, square footage, or dock and power detail online",
                "No accounts, online applications, or rent ledger",
                "Maintenance handled ad hoc by phone",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 border-b border-ink/10 py-3 text-[15px] last:border-b-0"
                >
                  <span className="font-mono text-sm font-bold text-leased">×</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-brand p-6 text-paper md:p-9">
            <h3 className="font-mono text-xs font-bold tracking-[0.14em] text-[#7eb8cc] uppercase">
              Where Easy Rental takes it
            </h3>
            <ul className="mt-4">
              {[
                "Interactive footprints with live, unit-level availability",
                "Spec sheets, a rich media bay, and an online application",
                "Applicant desk: status, demo verification, rent ledger",
                "Landlord desk for approvals, floor plans, and concierge jobs",
                "Trades who are verified, area-matched, and approved before they are assigned",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 border-b border-white/15 py-3 text-[15px] last:border-b-0"
                >
                  <span className="font-mono text-sm font-bold text-avail">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-8 md:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
          02 — Platform pillars
        </p>
        <h2 className="reveal mt-4 font-serif text-3xl font-semibold md:text-4xl">
          Three audiences, three desks.
        </h2>
        <div className="reveal mt-8 grid gap-px bg-ink/15 md:grid-cols-3">
          {[
            [
              "P—01",
              "Prospects find space",
              "A map-first public site where companies explore buildings, inspect a bay, and apply without a phone call.",
            ],
            [
              "P—02",
              "Applicants stay in the loop",
              "The same person tracks the application, walks a demo verification, and sees rent, late fees, and payments.",
            ],
            [
              "P—03",
              "Landlords run the portfolio",
              "Approvals, floor-plan hotspots, late-fee rules, and concierge jobs — scoped to one organisation at a time.",
            ],
          ].map(([num, title, body]) => (
            <article key={num} className="desk-chrome bg-paper p-7">
              <p className="font-mono text-xs tracking-widest text-terra">{num}</p>
              <h3 className="mt-3 font-serif text-2xl font-semibold">{title}</h3>
              <p className="mt-2 text-ink-soft">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="map" className="bg-brand py-16 text-paper">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-[#7eb8cc]">
            03 — The centrepiece
          </p>
          <h2 className="reveal mt-4 max-w-[16ch] font-serif text-4xl font-semibold text-paper md:text-5xl">
            Select a building. Click a unit. See everything.
          </h2>
          <p className="reveal mt-4 max-w-[62ch] text-lg text-paper/75">
            A working preview of the leasing map. Vacant bays stay bright, leased bays dim. The
            numbers are the seeded India portfolio — BBM Logistics Parks, Harbourline Yards India,
            and Sahni Global Realty (NRI).{" "}
            <span className="text-[#9ed0e0]">Open a bay to apply.</span>
          </p>
          <div className="reveal">
            <LeasingMap properties={properties} />
          </div>
        </div>
      </section>

      <section id="tenant" className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
          04 — Applicant experience
        </p>
        <h2 className="reveal mt-4 max-w-[16ch] font-serif text-3xl font-semibold md:text-4xl">
          From applicant to occupant, online.
        </h2>
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          <ol className="reveal">
            {[
              [
                "01",
                "Demo identity, not a password",
                "Pick Maya Chen or Devon Hale in the header. There is no auth provider and no secret.",
              ],
              [
                "02",
                "Online applications",
                "Company, use, and a note. The landlord sees it in an inbox scoped to their organisation.",
              ],
              [
                "03",
                "Rent ledger",
                "Due rent, GST (18%), a late fee after grace, and a demo UPI or eNACH payment. No bank is contacted.",
              ],
              [
                "04",
                "Verification wizard",
                "Defaults to India / Aadhaar. Other countries use a driving licence. Face match is simulated.",
              ],
              [
                "05",
                "Notices",
                "An in-app inbox. Email, web push, and WhatsApp are logged by a demo sender.",
              ],
            ].map(([num, title, body]) => (
              <li
                key={num}
                className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-ink/10 py-4"
              >
                <span className="font-mono text-xs font-bold text-terra">{num}</span>
                <div>
                  <h3 className="font-serif text-lg font-bold">{title}</h3>
                  <p className="text-[15px] text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="reveal overflow-hidden border border-ink/15 bg-card">
            <div className="flex items-center gap-2 border-b border-ink/10 bg-paper-3 px-4 py-3">
              <span className="font-mono text-[11px] text-ink-faint">desk.deskulpt / account</span>
            </div>
            <div className="grid gap-3 p-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Due", "Open rent + GST"],
                  ["1", "Late fee"],
                  ["Demo", "eNACH on file"],
                ].map(([n, l]) => (
                  <div key={l} className="border border-ink/10 bg-paper-2 p-3">
                    <div className="font-serif text-xl font-semibold text-brand">{n}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {l}
                    </div>
                  </div>
                ))}
              </div>
              {[
                ["June rent · Unit A1", "Paid"],
                ["September rent", "Due"],
                ["Late fee", "Due"],
              ].map(([label, pill]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border border-ink/10 bg-paper-2 px-3 py-2 text-sm"
                >
                  <span>{label}</span>
                  <span className="font-mono text-[10px] uppercase text-terra">{pill}</span>
                </div>
              ))}
              <Link href="/account/payments" className="font-serif text-sm font-bold text-terra">
                Open the ledger →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="admin" className="bg-brand-deep py-16 text-paper">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 md:px-8 lg:grid-cols-2">
          <div className="reveal overflow-hidden border border-white/15 bg-paper text-ink">
            <div className="flex items-center gap-2 border-b border-ink/10 bg-paper-3 px-4 py-3">
              <span className="font-mono text-[11px] text-ink-faint">landlord desk / overview</span>
            </div>
            <div className="grid gap-3 p-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["94%", "A sample occupancy"],
                  ["Rent roll", "From leased bays"],
                  ["Inbox", "Live applications"],
                ].map(([n, l]) => (
                  <div key={l} className="border border-ink/10 bg-paper-2 p-3">
                    <div className="font-serif text-lg font-semibold text-brand">{n}</div>
                    <div className="font-mono text-[10px] uppercase text-ink-faint">{l}</div>
                  </div>
                ))}
              </div>
              <div className="flex h-20 items-end gap-2">
                {[55, 68, 60, 80, 72, 92].map((height) => (
                  <div key={height} className="flex-1 bg-terra" style={{ height: `${height}%` }} />
                ))}
              </div>
              <Link href="/landlord" className="font-serif text-sm font-bold text-terra">
                Enter the landlord desk →
              </Link>
            </div>
          </div>
          <div>
            <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-[#7eb8cc]">
              05 — Management backend
            </p>
            <h2 className="reveal mt-4 font-serif text-4xl font-semibold text-paper md:text-5xl">
              One desk to run the portfolio.
            </h2>
            <ul className="reveal mt-6">
              {[
                [
                  "01",
                  "Application review",
                  "Approve or deny. Approval leases the bay and posts the next rent.",
                ],
                [
                  "02",
                  "Late fees and the ledger",
                  "Grace days, a flat fee, and a percent. The assessment pass is real arithmetic.",
                ],
                [
                  "03",
                  "Floor plans",
                  "Upload an image and place bays. The public plan uses the same coordinates.",
                ],
                [
                  "04",
                  "Concierge jobs",
                  "Assign an approved trade in that building’s area. They accept and complete.",
                ],
              ].map(([num, title, body]) => (
                <li
                  key={num}
                  className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-white/15 py-4"
                >
                  <span className="font-mono text-xs font-bold text-[#7eb8cc]">{num}</span>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-paper">{title}</h3>
                    <p className="text-[15px] text-paper/70">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
          06 — Going further
        </p>
        <h2 className="reveal mt-4 font-serif text-3xl font-semibold md:text-4xl">
          What this slice already does.
        </h2>
        <div className="reveal mt-8 grid gap-px bg-ink/10 md:grid-cols-3">
          {[
            [
              "F—01",
              "Unit media",
              "Stills, a GIF, video, a 360 photo in Pannellum, and a Matterport iframe slot on Unit B1.",
            ],
            ["F—02", "Floor-plan hotspots", "Click a pin on the public plan and land on that bay."],
            [
              "F—03",
              "Demo verification",
              "Aadhaar for India, a driving licence elsewhere. Simulated match only.",
            ],
            [
              "F—04",
              "Service providers",
              "Electricians, plumbers, couriers, cleaning. Approved per landlord, filtered by area.",
            ],
            [
              "F—05",
              "Payments interface",
              "Late-fee rules, GST, and a demo UPI / eNACH adapter. NRI landlords can display USD, CAD, or GBP.",
            ],
            [
              "F—06",
              "Installable PWA",
              "A manifest, a service worker, and an inbox with demo email, push, and WhatsApp logs.",
            ],
          ].map(([num, title, body]) => (
            <article key={num} className="bg-paper p-6">
              <p className="font-mono text-[11px] tracking-widest text-terra">{num}</p>
              <h3 className="mt-3 font-serif text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-ink/10 bg-paper-2 py-16">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
            07 — Architecture
          </p>
          <h2 className="reveal mt-4 font-serif text-3xl font-semibold md:text-4xl">
            A stack you can run without a secret.
          </h2>
          <p className="reveal mt-4 max-w-[62ch] text-ink-soft">
            Next.js, Tailwind, shadcn/ui, GSAP, Zod, and SQLite on the machine. Tenant id sits on
            every private row. Public bay pages are read without the session. Notifications and
            payments go through swap-ready interfaces — Redis, Kafka, and live processors are
            deliberately absent.
          </p>
          <ul className="reveal mt-8 grid gap-2 font-mono text-xs uppercase tracking-wider text-ink-faint sm:grid-cols-2 md:grid-cols-3">
            {[
              "Next.js",
              "TypeScript",
              "Tailwind",
              "shadcn/ui",
              "GSAP",
              "SQLite",
              "Zod",
              "Pannellum",
              "PWA",
            ].map((item) => (
              <li key={item} className="border-l-2 border-terra/40 pl-3 py-1">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="cta" className="mx-auto max-w-[1200px] px-4 py-20 md:px-8">
        <p className="reveal font-mono text-[12px] uppercase tracking-[0.22em] text-terra">
          Next step
        </p>
        <h2 className="reveal mt-4 max-w-[18ch] font-serif text-3xl font-semibold md:text-4xl">
          Walk the portfolio the way a prospect would.
        </h2>
        <div className="reveal mt-8 flex flex-wrap gap-3">
          <Link
            href="/properties/waterman/units/B1"
            className="bg-terra px-6 py-4 font-serif text-sm font-bold text-white transition-colors hover:bg-terra-dark"
          >
            Open Unit B1
          </Link>
          <Link
            href="/landlord"
            className="bg-brand px-6 py-4 font-serif text-sm font-bold text-paper transition-colors hover:bg-brand-deep"
          >
            Landlord desk
          </Link>
          <Link
            href="/provider"
            className="border border-ink/25 px-6 py-4 font-serif text-sm font-bold transition-colors hover:border-terra hover:text-terra"
          >
            Provider desk
          </Link>
        </div>
      </section>
    </Motion>
  )
}
