"use client"

import { missingPosterFields } from "@/lib/poster"

export type QrPosterDetails = {
  qrDataUrl: string
  buildingName: string
  unitCode: string
  targetUrl: string
  landlordName: string
  contactEmail: string
  address: string
  sqft: number
}


export function QrPoster(props: QrPosterDetails) {
  const missing = missingPosterFields(props)
  if (missing.length > 0) {
    return (
      <div className="border border-terra/40 bg-terra/10 px-4 py-4 text-sm text-ink">
        <p className="font-semibold">Cannot build this QR poster.</p>
        <p className="mt-1">Required details are missing:</p>
        <ul className="mt-2 list-disc pl-5">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-2 text-ink-soft">
          Add the missing fields on the organisation or unit, then reopen this page.
        </p>
      </div>
    )
  }

  const sqftLabel = `${Math.round(props.sqft).toLocaleString("en-IN")} SF`

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-terra px-4 py-2 font-serif text-sm font-bold text-white hover:bg-terra-dark"
        >
          Print QR poster
        </button>
        <a
          href={props.qrDataUrl}
          download={`deskulpt-${props.unitCode}-qr.png`}
          className="border border-ink/20 px-4 py-2 font-serif text-sm font-bold hover:border-terra"
        >
          Download QR PNG
        </a>
        <a
          href={props.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink/20 px-4 py-2 text-sm font-semibold text-terra hover:underline"
        >
          Open target URL
        </a>
      </div>

      <article
        id="qr-poster-sheet"
        className="mx-auto max-w-[210mm] border border-ink/15 bg-paper p-8 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none"
      >
        <div className="flex min-h-[277mm] flex-col justify-between border border-brand/20 bg-[linear-gradient(180deg,#f7f4ef_0%,#ffffff_45%)] px-10 py-12 print:min-h-[277mm]">
          <header>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-terra">
              {props.landlordName}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-brand md:text-5xl">
              {props.buildingName}
            </h1>
            <p className="mt-2 font-sans text-2xl font-extrabold text-ink">Unit {props.unitCode}</p>
            <dl className="mt-6 grid gap-3 text-sm text-ink">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  Address
                </dt>
                <dd className="mt-0.5 font-medium">{props.address}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  Size
                </dt>
                <dd className="mt-0.5 font-medium">{sqftLabel}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  Landlord contact
                </dt>
                <dd className="mt-0.5 font-medium">
                  <a href={`mailto:${props.contactEmail}`} className="text-terra hover:underline">
                    {props.contactEmail}
                  </a>
                </dd>
              </div>
            </dl>
          </header>

          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-center font-serif text-2xl font-semibold text-ink md:text-3xl">
              Scan to view &amp; apply
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.qrDataUrl}
              alt={`QR code for Unit ${props.unitCode}`}
              className="h-[68mm] w-[68mm] bg-white p-3"
              width={512}
              height={512}
            />
            <p className="max-w-md break-all text-center font-mono text-[11px] text-ink-soft">
              {props.targetUrl}
            </p>
          </div>

          <footer className="flex items-end justify-between gap-4 border-t border-ink/10 pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Easy Rental · industrial leasing
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              A4 poster
            </p>
          </footer>
        </div>
      </article>
    </div>
  )
}
