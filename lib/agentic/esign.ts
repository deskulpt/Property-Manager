/**
 * Demo eSign adapter for Ask Easy lease onboard.
 * Marks agreements ready/sent only after landlord Approve.
 * Swap `DemoESignAdapter` for Digio / eMudhra / DocuSign later — same interface.
 */

export type ESignProviderId = "demo" | "docusign" | "digio" | "emudhra"

export type ESignSendRequest = {
  agreementId: string
  tenantId: string
  /** Signers derived from lease parties (primary/secondary/guarantor). */
  signers: { role: string; name: string; email: string }[]
  documentHtml: string
  country: string
  region: string
}

export type ESignSendResult = {
  ok: true
  provider: ESignProviderId
  envelopeId: string
  status: "sent"
} | {
  ok: false
  error: string
}

export interface ESignProvider {
  readonly id: ESignProviderId
  /** Never called without an approved propose_esign_send proposal. */
  send(req: ESignSendRequest): Promise<ESignSendResult> | ESignSendResult
}

/** In-process stub — India-capable providers plug in behind this later. */
export class DemoESignAdapter implements ESignProvider {
  readonly id: ESignProviderId = "demo"

  send(req: ESignSendRequest): ESignSendResult {
    if (!req.signers.length) {
      return { ok: false, error: "At least one signer (primary tenant) is required." }
    }
    if (!req.documentHtml.trim()) {
      return { ok: false, error: "Agreement document is empty." }
    }
    const envelopeId = `demo-env-${req.agreementId.slice(0, 8)}-${Date.now().toString(36)}`
    return { ok: true, provider: "demo", envelopeId, status: "sent" }
  }
}

let activeProvider: ESignProvider = new DemoESignAdapter()

export function getESignProvider(): ESignProvider {
  return activeProvider
}

/** Test / future config hook — do not call from Ask Easy prompt path. */
export function setESignProvider(provider: ESignProvider) {
  activeProvider = provider
}
