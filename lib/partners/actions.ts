"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { notify } from "@/lib/notifications"
import {
  AFFILIATE_SUBTYPES,
  PARTNER_STATUSES,
  SERVICE_SUBTYPES,
  type IdCheckResult,
  type PartnerStatus,
  type PartnerTrack,
} from "@/lib/partners/types"
import {
  advancePartnerStatus,
  createPartnerApplication,
  createPartnerReferral,
  replacePartnerAreas,
  setPartnerDemandOk,
  setPartnerIdCheck,
  setPartnerNotes,
  setReferralStatus,
} from "@/lib/partners/store"
import { canOpenCms, staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"
import { toE164 } from "@/lib/market"

export type PartnerFormState = {
  error: string | null
  fieldErrors: Record<string, string>
  ok?: boolean
  id?: string
}

const panRe = /^[A-Z]{5}[0-9]{4}[A-Z]$/i
const gstinRe = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i

function issues(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

function phone91(raw: string) {
  const digits = raw.replace(/\D/g, "")
  const national = digits.startsWith("91") && digits.length > 10 ? digits.slice(-10) : digits
  const e164 = toE164("+91", national)
  if (!e164) return null
  return e164
}

export async function submitAffiliateApply(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const schema = z.object({
    subtype: z.enum(AFFILIATE_SUBTYPES as [string, ...string[]]),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(8),
    city: z.string().trim().min(2).max(80),
    pins: z.string().trim().min(3),
    pan: z.string().trim().regex(panRe, "PAN format ABCDE1234F"),
    aadhaarLast4: z.string().trim().regex(/^[0-9]{4}$/, "Last 4 digits"),
    aadhaarConsent: z.literal("on"),
    gstin: z.string().trim().optional(),
    licenceRef: z.string().trim().optional(),
    portfolio: z.string().trim().optional(),
    ageConsent: z.literal("on"),
  })
  const parsed = schema.safeParse({
    subtype: formData.get("subtype"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    pins: formData.get("pins"),
    pan: formData.get("pan"),
    aadhaarLast4: formData.get("aadhaarLast4"),
    aadhaarConsent: formData.get("aadhaarConsent"),
    gstin: String(formData.get("gstin") ?? "").trim() || undefined,
    licenceRef: String(formData.get("licenceRef") ?? "").trim() || undefined,
    portfolio: String(formData.get("portfolio") ?? "").trim() || undefined,
    ageConsent: formData.get("ageConsent"),
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }
  if (parsed.data.gstin && !gstinRe.test(parsed.data.gstin)) {
    return { error: null, fieldErrors: { gstin: "GSTIN format looks invalid." } }
  }
  const phone = phone91(parsed.data.phone)
  if (!phone) return { error: null, fieldErrors: { phone: "Use a +91 mobile number." } }

  const pins = parsed.data.pins
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const result = createPartnerApplication({
    track: "affiliate",
    subtype: parsed.data.subtype as "realtor" | "architect" | "contractor",
    name: parsed.data.name,
    phone,
    email: parsed.data.email,
    pan: parsed.data.pan.toUpperCase(),
    aadhaarLast4: parsed.data.aadhaarLast4,
    aadhaarConsent: true,
    gstin: parsed.data.gstin?.toUpperCase() ?? null,
    licenceRef: parsed.data.licenceRef ?? null,
    docsStub: parsed.data.portfolio ? `portfolio:${parsed.data.portfolio}` : null,
    areas: [
      { citySlug: parsed.data.city, pinPrefix: pins[0]?.slice(0, 4) ?? null },
      ...pins.slice(1).map((p) => ({ pinPrefix: p.slice(0, 4) })),
    ],
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  revalidatePath("/cms/partners")
  redirect(`/partners/status?id=${result.id}`)
}

export async function submitServiceApply(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const schema = z.object({
    subtype: z.enum(SERVICE_SUBTYPES as [string, ...string[]]),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(8),
    city: z.string().trim().min(2).max(80),
    homePin: z.string().trim().regex(/^[1-9][0-9]{5}$/, "6-digit PIN"),
    radiusKm: z.coerce.number().min(5).max(100).default(25),
    extraPins: z.string().trim().optional(),
    pan: z.string().trim().regex(panRe, "PAN format ABCDE1234F"),
    aadhaarLast4: z.string().trim().regex(/^[0-9]{4}$/),
    aadhaarConsent: z.literal("on"),
    gstin: z.string().trim().optional(),
    tradeDoc: z.string().trim().optional(),
    onboardingAck: z.literal("on"),
    ageConsent: z.literal("on"),
  })
  const parsed = schema.safeParse({
    subtype: formData.get("subtype"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    homePin: formData.get("homePin"),
    radiusKm: formData.get("radiusKm") || 25,
    extraPins: String(formData.get("extraPins") ?? "").trim() || undefined,
    pan: formData.get("pan"),
    aadhaarLast4: formData.get("aadhaarLast4"),
    aadhaarConsent: formData.get("aadhaarConsent"),
    gstin: String(formData.get("gstin") ?? "").trim() || undefined,
    tradeDoc: String(formData.get("tradeDoc") ?? "").trim() || undefined,
    onboardingAck: formData.get("onboardingAck"),
    ageConsent: formData.get("ageConsent"),
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }
  const phone = phone91(parsed.data.phone)
  if (!phone) return { error: null, fieldErrors: { phone: "Use a +91 mobile number." } }

  const extras = (parsed.data.extraPins ?? "")
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const result = createPartnerApplication({
    track: "service",
    subtype: parsed.data.subtype as "plumber" | "electrician" | "cleaning" | "courier",
    name: parsed.data.name,
    phone,
    email: parsed.data.email,
    pan: parsed.data.pan.toUpperCase(),
    aadhaarLast4: parsed.data.aadhaarLast4,
    aadhaarConsent: true,
    gstin: parsed.data.gstin?.toUpperCase() ?? null,
    docsStub: parsed.data.tradeDoc || "trade-cert-stub.pdf",
    areas: [
      {
        citySlug: parsed.data.city,
        pinPrefix: parsed.data.homePin.slice(0, 4),
        radiusKm: parsed.data.radiusKm,
      },
      ...extras.map((p) => ({ pinPrefix: p.slice(0, 4) })),
    ],
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  revalidatePath("/cms/partners")
  redirect(`/partners/status?id=${result.id}`)
}

export async function submitPartnerRefer(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const schema = z.object({
    referrerName: z.string().trim().min(2),
    referrerEmail: z.string().trim().email(),
    referrerPhone: z.string().trim().min(8),
    referredName: z.string().trim().min(2),
    referredEmail: z.string().trim().email(),
    referredPhone: z.string().trim().min(8),
    track: z.enum(["affiliate", "service"]),
    subtype: z.string().trim().min(2),
    city: z.string().trim().min(2),
    pin: z.string().trim().regex(/^[1-9][0-9]{5}$/),
    consent: z.literal("on"),
  })
  const parsed = schema.safeParse({
    referrerName: formData.get("referrerName"),
    referrerEmail: formData.get("referrerEmail"),
    referrerPhone: formData.get("referrerPhone"),
    referredName: formData.get("referredName"),
    referredEmail: formData.get("referredEmail"),
    referredPhone: formData.get("referredPhone"),
    track: formData.get("track"),
    subtype: formData.get("subtype"),
    city: formData.get("city"),
    pin: formData.get("pin"),
    consent: formData.get("consent"),
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }
  const allowed =
    parsed.data.track === "affiliate"
      ? AFFILIATE_SUBTYPES
      : SERVICE_SUBTYPES
  if (!allowed.includes(parsed.data.subtype as never)) {
    return { error: null, fieldErrors: { subtype: "Pick a valid type for this track." } }
  }
  const referrerPhone = phone91(parsed.data.referrerPhone)
  const referredPhone = phone91(parsed.data.referredPhone)
  if (!referrerPhone) return { error: null, fieldErrors: { referrerPhone: "Use +91." } }
  if (!referredPhone) return { error: null, fieldErrors: { referredPhone: "Use +91." } }

  const result = createPartnerReferral({
    referrerName: parsed.data.referrerName,
    referrerPhone,
    referrerEmail: parsed.data.referrerEmail,
    referredName: parsed.data.referredName,
    referredPhone,
    referredEmail: parsed.data.referredEmail,
    track: parsed.data.track as PartnerTrack,
    subtype: parsed.data.subtype as never,
    city: parsed.data.city,
    pin: parsed.data.pin,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  revalidatePath("/cms/partners/referrals")
  redirect(`/partners/refer?thanks=${result.id}`)
}

async function requirePartnerStaff() {
  const user = await getSessionUser()
  if (!user || !canOpenCms(user.role)) return null
  const caps = staffCapabilities(user.role)
  if (!caps) return null
  if (
    user.role !== "super_admin" &&
    user.role !== "account_manager" &&
    user.role !== "service_manager"
  ) {
    return null
  }
  return user
}

export async function submitPartnerAdvance(formData: FormData) {
  const user = await requirePartnerStaff()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  const to = String(formData.get("to") ?? "") as PartnerStatus
  const result = advancePartnerStatus(
    id,
    PARTNER_STATUSES.includes(to) ? to : undefined,
  )
  if (result.ok) {
    const app = (await import("@/lib/partners/store")).getPartnerApplication(id)
    if (app) {
      notify({
        userId: user.id,
        title: "Partner status updated",
        body: `${app.name} → ${result.status}`,
        href: `/cms/partners/${id}`,
      })
    }
  }
  revalidatePath("/cms/partners")
  revalidatePath(`/cms/partners/${id}`)
}

export async function submitPartnerIdCheck(formData: FormData) {
  const user = await requirePartnerStaff()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  const result = String(formData.get("result") ?? "pending") as IdCheckResult
  setPartnerIdCheck(id, result)
  revalidatePath(`/cms/partners/${id}`)
}

export async function submitPartnerDemand(formData: FormData) {
  const user = await requirePartnerStaff()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  const demandOk = formData.get("demandOk") === "1"
  setPartnerDemandOk(id, demandOk)
  revalidatePath(`/cms/partners/${id}`)
}

export async function submitPartnerNotes(formData: FormData) {
  const user = await requirePartnerStaff()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  setPartnerNotes(id, String(formData.get("notes") ?? ""))
  revalidatePath(`/cms/partners/${id}`)
}

export async function submitPartnerAreas(formData: FormData) {
  const user = await requirePartnerStaff()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  const citySlug = String(formData.get("citySlug") ?? "").trim() || null
  const pinPrefix = String(formData.get("pinPrefix") ?? "").trim() || null
  const radiusKm = Number(formData.get("radiusKm") || 0) || null
  replacePartnerAreas(id, [{ citySlug, pinPrefix, radiusKm }])
  revalidatePath(`/cms/partners/${id}`)
}

export async function submitReferralInvite(formData: FormData) {
  const user = await requirePartnerStaff()
  if (!user) return
  setReferralStatus(String(formData.get("id") ?? ""), "invited")
  revalidatePath("/cms/partners/referrals")
}
