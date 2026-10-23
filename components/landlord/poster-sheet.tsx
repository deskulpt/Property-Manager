import type { PosterPaper } from "@/lib/poster-shared"

type PosterSheetProps = {
  tenantName: string
  title: string
  subtitle: string
  address: string
  sizeLabel: string
  email: string
  targetUrl: string
  qrDataUrl: string
  paper: PosterPaper
}

export function PosterSheet({
  tenantName,
  title,
  subtitle,
  address,
  sizeLabel,
  email,
  targetUrl,
  qrDataUrl,
  paper,
}: PosterSheetProps) {
  const paperClass = paper === "letter" ? "poster-sheet--letter" : "poster-sheet--a4"

  return (
    <article
      id="qr-poster-sheet"
      data-testid="qr-poster-sheet"
      data-paper={paper}
      className={`poster-sheet ${paperClass} flex min-h-[277mm] flex-col justify-between border border-ink/15 bg-paper px-10 py-12 text-ink shadow-sm print:min-h-[277mm] print:border-0 print:shadow-none`}
    >
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-terra">{tenantName}</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-brand md:text-5xl">
          {title}
        </h1>
        <p className="mt-2 font-sans text-2xl font-extrabold text-ink">{subtitle}</p>
        <dl className="mt-6 grid gap-3 text-sm text-ink">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Address</dt>
            <dd className="mt-0.5 font-medium">{address}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Size</dt>
            <dd className="mt-0.5 font-medium">{sizeLabel}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Landlord contact
            </dt>
            <dd className="mt-0.5 font-medium">
              <a href={`mailto:${email}`} className="text-terra hover:underline">
                {email}
              </a>
            </dd>
          </div>
        </dl>
      </header>

      <div className="flex flex-col items-center gap-6 py-8">
        <p className="text-center font-serif text-2xl font-semibold text-ink md:text-3xl">
          Scan to view &amp; apply
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- print/PDF needs a static data URL */}
        <img
          src={qrDataUrl}
          alt={`QR code linking to ${targetUrl}`}
          className="h-[68mm] w-[68mm] bg-white p-3"
          width={512}
          height={512}
          data-testid="qr-poster-code"
        />
        <p className="max-w-md break-all text-center font-mono text-[11px] text-ink-soft">{targetUrl}</p>
      </div>

      <footer className="flex items-end justify-between gap-4 border-t border-ink/10 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Easy Rental · industrial leasing
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {paper === "letter" ? "Letter poster" : "A4 poster"}
        </p>
      </footer>
    </article>
  )
}
