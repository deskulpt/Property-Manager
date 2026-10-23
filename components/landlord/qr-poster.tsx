"use client"

import { useMemo, useState, useTransition } from "react"
import { jsPDF } from "jspdf"
import { PosterSheet } from "@/components/landlord/poster-sheet"
import { missingPosterFields, type PosterPaper } from "@/lib/poster-shared"

export type QrPosterDetails = {
  qrDataUrl: string
  buildingName: string
  unitCode: string
  targetUrl: string
  landlordName: string
  contactEmail: string
  address: string
  sqft: number
  /** When set, subtitle uses this instead of `Unit {unitCode}`. */
  subtitle?: string
  filenameBase?: string
}

const PAPER_CSS: Record<PosterPaper, string> = {
  a4: "A4 portrait",
  letter: "letter portrait",
}

export function QrPoster(props: QrPosterDetails) {
  const [paper, setPaper] = useState<PosterPaper>("a4")
  const [pending, startTransition] = useTransition()
  const missing = missingPosterFields(props)
  const enabled = missing.length === 0
  const subtitle = props.subtitle ?? `Unit ${props.unitCode}`
  const sizeLabel = `${Math.round(props.sqft).toLocaleString("en-IN")} SF`
  const filenameBase = props.filenameBase ?? `easy-rental-${props.unitCode}`

  const printCss = useMemo(
    () => `
      .poster-sheet--letter { max-width: 8.5in; min-height: 11in; }
      @media print {
        @page { size: ${PAPER_CSS[paper]}; margin: 0; }
        body * { visibility: hidden !important; }
        #qr-poster-print-root, #qr-poster-print-root * { visibility: visible !important; }
        #qr-poster-print-root {
          position: absolute; left: 0; top: 0; width: 100%; background: white;
        }
        .poster-sheet {
          max-width: none !important; width: 100% !important; min-height: 100vh !important;
          border: none !important; box-shadow: none !important; margin: 0 !important;
        }
        .no-print { display: none !important; }
      }
    `,
    [paper],
  )

  function handleDownloadPdf() {
    if (!enabled) return
    startTransition(() => {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: paper === "letter" ? "letter" : "a4",
      })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 16
      let y = 18

      doc.setTextColor(14, 110, 140)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.text(props.landlordName.toUpperCase(), margin, y)
      y += 10

      doc.setTextColor(18, 21, 26)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(22)
      const titleLines = doc.splitTextToSize(props.buildingName, pageW - margin * 2)
      doc.text(titleLines, margin, y)
      y += titleLines.length * 9 + 2

      doc.setFontSize(14)
      doc.text(subtitle, margin, y)
      y += 10

      doc.setDrawColor(18, 21, 26)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageW - margin, y)
      y += 8

      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text("ADDRESS", margin, y)
      y += 5
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      const addressLines = doc.splitTextToSize(props.address, pageW - margin * 2)
      doc.text(addressLines, margin, y)
      y += addressLines.length * 5.5 + 4

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.text("SIZE", margin, y)
      doc.text("LANDLORD CONTACT", margin + (pageW - margin * 2) / 2, y)
      y += 5
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text(sizeLabel, margin, y)
      doc.text(props.contactEmail, margin + (pageW - margin * 2) / 2, y)
      y += 8

      doc.line(margin, y, pageW - margin, y)
      y += 14

      doc.setFontSize(16)
      doc.text("Scan to view & apply", pageW / 2, y, { align: "center" })
      y += 6

      const qrSize = Math.min(90, pageW - margin * 2)
      const qrX = (pageW - qrSize) / 2
      doc.addImage(props.qrDataUrl, "PNG", qrX, y, qrSize, qrSize)
      y += qrSize + 8

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      const urlLines = doc.splitTextToSize(props.targetUrl, pageW - margin * 2)
      doc.text(urlLines, pageW / 2, y, { align: "center" })

      const footerY = doc.internal.pageSize.getHeight() - 12
      doc.setFontSize(8)
      doc.line(margin, footerY - 6, pageW - margin, footerY - 6)
      doc.text("EASY RENTAL · INDUSTRIAL LEASING", margin, footerY)
      doc.text(paper === "letter" ? "LETTER POSTER" : "A4 POSTER", pageW - margin, footerY, {
        align: "right",
      })

      doc.save(`${filenameBase}-${paper}.pdf`)
    })
  }

  if (!enabled) {
    return (
      <div className="border border-terra/40 bg-terra/10 px-4 py-4 text-sm text-ink" data-testid="poster-gate">
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

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />
      <div className="mb-4 flex flex-wrap items-end gap-2 print:hidden no-print">
        <label className="grid gap-1 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Paper</span>
          <select
            className="border border-ink/20 bg-card px-3 py-2 text-sm"
            value={paper}
            onChange={(event) => setPaper(event.target.value as PosterPaper)}
            data-testid="poster-paper-size"
          >
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pending}
          className="bg-terra px-4 py-2 font-serif text-sm font-bold text-white hover:bg-terra-dark disabled:opacity-60"
          data-testid="poster-download-pdf"
        >
          {pending ? "Building PDF…" : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="border border-ink/20 px-4 py-2 font-serif text-sm font-bold hover:border-terra"
          data-testid="poster-print"
        >
          Print poster
        </button>
        <a
          href={props.qrDataUrl}
          download={`${filenameBase}-qr.png`}
          className="border border-ink/20 px-4 py-2 font-serif text-sm font-bold hover:border-terra"
        >
          Download QR PNG
        </a>
        <a
          href={props.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink/20 px-4 py-2 text-sm font-semibold text-terra hover:underline"
          data-testid="poster-open-url"
        >
          Open target URL
        </a>
      </div>

      <div id="qr-poster-print-root" className="mx-auto max-w-[210mm]">
        <PosterSheet
          tenantName={props.landlordName}
          title={props.buildingName}
          subtitle={subtitle}
          address={props.address}
          sizeLabel={sizeLabel}
          email={props.contactEmail}
          targetUrl={props.targetUrl}
          qrDataUrl={props.qrDataUrl}
          paper={paper}
        />
      </div>
    </div>
  )
}
