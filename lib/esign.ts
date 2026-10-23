import "server-only"
import fs from "node:fs"
import path from "node:path"

/**
 * E-sign provider boundary. demoESign stamps a local PDF and advances a
 * status machine with no network. A live DocuSign adapter can implement the
 * same methods later behind hosted secrets.
 */
export type EnvelopeStatus = "draft" | "sent" | "completed" | "voided"

export type EnvelopeRecord = {
  id: string
  status: EnvelopeStatus
  documentName: string
  signedPath: string | null
}

export interface ESignProvider {
  readonly name: string
  createEnvelope(input: {
    documentName: string
    signatoryName: string
    signatoryEmail: string
  }): { envelopeId: string; status: EnvelopeStatus }
  send(envelopeId: string): { ok: true; status: "sent" }
  getStatus(envelopeId: string): EnvelopeStatus
  complete(envelopeId: string, signatoryName: string): {
    ok: true
    status: "completed"
    signedPath: string
  }
  downloadSigned(envelopeId: string): { ok: true; path: string } | { ok: false; error: string }
}

type DemoState = {
  status: EnvelopeStatus
  documentName: string
  signatoryName: string
  signatoryEmail: string
  signedPath: string | null
}

const globalEsign = globalThis as unknown as {
  __deskulptEsign?: Map<string, DemoState>
}

function store() {
  if (!globalEsign.__deskulptEsign) globalEsign.__deskulptEsign = new Map()
  return globalEsign.__deskulptEsign
}

function stampDir() {
  return path.join(process.cwd(), "data", "esign")
}

function writeStamp(envelopeId: string, documentName: string, signatoryName: string) {
  const dir = stampDir()
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${envelopeId}.txt`)
  const body = [
    "Easy Rental · demo e-sign stamp",
    `Envelope: ${envelopeId}`,
    `Document: ${documentName}`,
    `Signed by: ${signatoryName}`,
    `At: ${new Date().toISOString()}`,
    "",
    "This is a local demo stamp. No DocuSign network call was made.",
  ].join("\n")
  fs.writeFileSync(filePath, body, "utf8")
  return `/files/esign/${envelopeId}.txt`
}

export const demoESign: ESignProvider = {
  name: "demoESign",
  createEnvelope(input) {
    const envelopeId = crypto.randomUUID()
    store().set(envelopeId, {
      status: "draft",
      documentName: input.documentName,
      signatoryName: input.signatoryName,
      signatoryEmail: input.signatoryEmail,
      signedPath: null,
    })
    return { envelopeId, status: "draft" }
  },
  send(envelopeId) {
    const row = store().get(envelopeId)
    if (!row) throw new Error("Envelope not found")
    if (row.status !== "draft" && row.status !== "sent") {
      throw new Error(`Cannot send from status ${row.status}`)
    }
    row.status = "sent"
    return { ok: true as const, status: "sent" as const }
  },
  getStatus(envelopeId) {
    const row = store().get(envelopeId)
    if (!row) throw new Error("Envelope not found")
    return row.status
  },
  complete(envelopeId, signatoryName) {
    const row = store().get(envelopeId)
    if (!row) throw new Error("Envelope not found")
    if (row.status !== "sent") throw new Error("Envelope is not awaiting signature")
    const signedPath = writeStamp(envelopeId, row.documentName, signatoryName)
    row.status = "completed"
    row.signedPath = signedPath
    row.signatoryName = signatoryName
    return { ok: true as const, status: "completed" as const, signedPath }
  },
  downloadSigned(envelopeId) {
    const row = store().get(envelopeId)
    if (!row?.signedPath) return { ok: false as const, error: "No signed document yet." }
    return { ok: true as const, path: row.signedPath }
  },
}

/** Hydrate in-memory demo state from a persisted DB row (process restarts). */
export function hydrateDemoEnvelope(row: {
  id: string
  status: EnvelopeStatus
  documentName: string
  signatoryName: string
  signatoryEmail: string
  signedPath: string | null
}) {
  store().set(row.id, {
    status: row.status,
    documentName: row.documentName,
    signatoryName: row.signatoryName,
    signatoryEmail: row.signatoryEmail,
    signedPath: row.signedPath,
  })
}
