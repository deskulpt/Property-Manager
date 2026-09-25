"use server"

import fs from "node:fs/promises"
import path from "node:path"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  assessLateFees,
  assignJob,
  createApplication,
  createJob,
  decideApplication,
  getUser,
  landlordIds,
  openApplicationTenants,
  payDue,
  saveFloorPlan,
  saveHotspots,
  saveLateFeeRule,
  saveVerification,
  setAutopay,
  setProviderApproval,
  transitionJob,
  upsertMethod,
} from "@/lib/db"
import { TRADES } from "@/lib/format"
import { notify, notifyMany } from "@/lib/notifications"
import { demoPayments } from "@/lib/payments"
import { getSessionUser, SESSION_COOKIE } from "@/lib/session"
import { simulateMatch } from "@/lib/verification"

function refresh(paths: string[]) {
  for (const item of paths) revalidatePath(item)
}

function issues(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function switchSession(userId: string) {
  const jar = await cookies()
  if (!userId || userId === "visitor") {
    jar.delete(SESSION_COOKIE)
    return
  }
  const user = getUser(userId)
  if (!user) return
  jar.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

const applicationSchema = z.object({
  unitId: z.string().min(1),
  company: z.string().trim().min(2, "Enter the company name"),
  contactName: z.string().trim().min(2, "Enter a contact name"),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a work email"),
  intendedUse: z.string().trim().min(3, "Say how the bay will be used"),
  notes: z.string().trim().max(1000).optional(),
})

export type ApplyState = {
  error: string | null
  fieldErrors: Record<string, string>
}

export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return {
      error: "Switch to an applicant in the demo header before you apply.",
      fieldErrors: {},
    }
  }
  const parsed = applicationSchema.safeParse({
    unitId: formData.get("unitId"),
    company: formData.get("company"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    intendedUse: formData.get("intendedUse"),
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }
  const result = createApplication({
    ...parsed.data,
    notes: parsed.data.notes ?? "",
    applicantId: user.id,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  notify({
    userId: user.id,
    title: "Application submitted",
    body: `${parsed.data.company} is in review for Unit ${result.code} at ${result.propertyName}.`,
    href: "/account",
  })
  notifyMany(
    landlordIds(result.tenantId).map((id) => ({
      userId: id,
      title: "New application",
      body: `${parsed.data.contactName} at ${parsed.data.company} applied for Unit ${result.code}.`,
      href: "/landlord/applications",
    })),
  )
  refresh(["/", "/properties", `/properties/${result.slug}`, `/properties/${result.slug}/units/${result.code}`, "/account", "/landlord", "/landlord/applications", "/inbox"])
  redirect("/account?notice=Application+submitted.+The+landlord+can+review+it+from+their+inbox.")
}

export async function reviewApplication(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const decision = formData.get("decision") === "approved" ? "approved" : "denied"
  const applicationId = String(formData.get("applicationId") ?? "")
  const result = decideApplication(user.tenantId, applicationId, decision)
  if (!result.ok) return
  const verb = decision === "approved" ? "approved" : "declined"
  notify({
    userId: result.application.applicantId,
    title: `Application ${verb}`,
    body: `${user.tenantName ?? "Your landlord"} ${verb} the application for Unit ${result.application.unitCode}.`,
    href: decision === "approved" ? "/account/payments" : "/account",
  })
  for (const applicantId of result.deniedIds) {
    notify({
      userId: applicantId,
      title: "Application declined",
      body: `Unit ${result.application.unitCode} was leased to another applicant.`,
      href: "/account",
    })
  }
  refresh([
    "/",
    "/properties",
    `/properties/${result.application.propertySlug}`,
    `/properties/${result.application.propertySlug}/units/${result.application.unitCode}`,
    "/account",
    "/account/payments",
    "/landlord",
    "/landlord/applications",
    "/landlord/ledger",
    "/inbox",
  ])
}

const jobSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().trim().min(3, "Give the job a title"),
  details: z.string().trim().min(3, "Describe the work"),
  trade: z.enum(TRADES),
  providerId: z.string().optional(),
})

export async function submitJob(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { error: "Switch to a landlord admin to create a job.", fieldErrors: {} }
  }
  const parsed = jobSchema.safeParse({
    propertyId: formData.get("propertyId"),
    unitId: String(formData.get("unitId") ?? ""),
    title: formData.get("title"),
    details: formData.get("details"),
    trade: formData.get("trade"),
    providerId: String(formData.get("providerId") ?? ""),
  })
  if (!parsed.success) return { error: "Check the job form.", fieldErrors: issues(parsed.error) }
  const result = createJob({
    tenantId: user.tenantId,
    propertyId: parsed.data.propertyId,
    unitId: parsed.data.unitId || null,
    title: parsed.data.title,
    details: parsed.data.details,
    trade: parsed.data.trade,
    providerId: parsed.data.providerId || null,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  if (result.providerId) {
    notify({
      userId: result.providerId,
      title: "Concierge job assigned",
      body: `${parsed.data.title} at ${result.propertyName} is waiting for you to accept.`,
      href: "/provider",
    })
  }
  refresh(["/landlord/jobs", "/landlord", "/provider", "/inbox"])
  return { error: null, fieldErrors: {} }
}

export async function submitAssignment(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const result = assignJob(
    user.tenantId,
    String(formData.get("jobId") ?? ""),
    String(formData.get("providerId") ?? ""),
  )
  if (!result.ok || !result.job.providerId) return
  notify({
    userId: result.job.providerId,
    title: "Concierge job assigned",
    body: `${result.job.title} at ${result.job.propertyName} is waiting for you to accept.`,
    href: "/provider",
  })
  refresh(["/landlord/jobs", "/provider", "/inbox"])
}

export async function submitProviderTransition(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "service_provider") return
  const next = formData.get("next") === "complete" ? "complete" : "accepted"
  const result = transitionJob(user.id, String(formData.get("jobId") ?? ""), next)
  if (!result.ok) return
  notifyMany(
    landlordIds(result.job.tenantId).map((id) => ({
      userId: id,
      title: next === "complete" ? "Job complete" : "Job accepted",
      body: `${user.name} ${next === "complete" ? "completed" : "accepted"} “${result.job.title}”.`,
      href: "/landlord/jobs",
    })),
  )
  refresh(["/provider", "/landlord/jobs", "/inbox"])
}

export async function submitProviderDecision(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const status = formData.get("status") === "rejected" ? "rejected" : "approved"
  const providerId = String(formData.get("providerId") ?? "")
  const result = setProviderApproval(user.tenantId, providerId, status)
  if (!result.ok) return
  notify({
    userId: providerId,
    title: status === "approved" ? "Approved for assignments" : "Not approved",
    body:
      status === "approved"
        ? `${user.tenantName ?? "A landlord"} can now assign you concierge jobs in your service area.`
        : `${user.tenantName ?? "A landlord"} did not approve you for assignments.`,
    href: "/provider",
  })
  refresh(["/landlord/providers", "/landlord/jobs", "/provider", "/inbox"])
}

const spotSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(100).nullable(),
  y: z.number().min(0).max(100).nullable(),
})

export async function submitHotspots(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const propertyId = String(formData.get("propertyId") ?? "")
  let spots: z.infer<typeof spotSchema>[] = []
  try {
    spots = z.array(spotSchema).parse(JSON.parse(String(formData.get("spots") ?? "[]")))
  } catch {
    return
  }
  const result = saveHotspots(user.tenantId, propertyId, spots)
  if (!result.ok) return
  refresh([`/properties/${result.slug}`, `/landlord/properties/${propertyId}`])
}

const TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
])

export async function submitFloorPlan(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const propertyId = String(formData.get("propertyId") ?? "")
  const file = formData.get("floorPlan")
  if (!(file instanceof File) || file.size === 0) return
  if (file.size > 5_000_000) return
  const ext = TYPES.get(file.type)
  if (!ext) return
  const name = `${propertyId}-${Date.now()}.${ext}`
  const dir = path.join(process.cwd(), "data", "uploads")
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()))
  const result = saveFloorPlan(user.tenantId, propertyId, `/files/${name}`)
  if (!result.ok) return
  refresh([`/properties/${result.slug}`, `/landlord/properties/${propertyId}`])
}

export async function submitLateFeeRule(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const parsed = z
    .object({
      graceDays: z.coerce.number().int().min(0).max(60),
      flatDollars: z.coerce.number().min(0).max(100000),
      percent: z.coerce.number().min(0).max(100),
    })
    .safeParse({
      graceDays: formData.get("graceDays"),
      flatDollars: formData.get("flatDollars"),
      percent: formData.get("percent"),
    })
  if (!parsed.success) return
  saveLateFeeRule(user.tenantId, {
    graceDays: parsed.data.graceDays,
    flatCents: Math.round(parsed.data.flatDollars * 100),
    percentBps: Math.round(parsed.data.percent * 100),
  })
  refresh(["/landlord/ledger", "/account/payments"])
}

export async function submitAssessment() {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const created = assessLateFees(user.tenantId)
  if (created > 0) {
    notify({
      userId: user.id,
      title: "Late fees assessed",
      body: `${created} late fee${created === 1 ? "" : "s"} added from the current rule. Demo books only.`,
      href: "/landlord/ledger",
    })
  }
  refresh(["/landlord/ledger", "/account/payments", "/inbox"])
}

export async function submitMethod(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return { error: "Switch to an applicant to save a payment method.", fieldErrors: {} }
  }
  const parsed = z
    .object({
      tenantId: z.string().min(1, "Choose the landlord"),
      last4: z.string().regex(/^\d{4}$/, "Enter any 4 digits. This is not a card charge."),
      autopay: z.string().optional(),
    })
    .safeParse({
      tenantId: formData.get("tenantId"),
      last4: formData.get("last4"),
      autopay: formData.get("autopay") ?? "",
    })
  if (!parsed.success) return { error: "Check the payment method.", fieldErrors: issues(parsed.error) }
  const attached = demoPayments.attachMethod({
    userId: user.id,
    tenantId: parsed.data.tenantId,
    last4: parsed.data.last4,
    autopay: parsed.data.autopay === "on",
  })
  const saved = upsertMethod({
    userId: user.id,
    tenantId: parsed.data.tenantId,
    brand: attached.brand,
    last4: attached.last4,
    autopay: parsed.data.autopay === "on",
    providerRef: attached.providerRef,
  })
  if (!saved.ok) return { error: saved.error, fieldErrors: {} }
  demoPayments.setAutopay({ providerRef: attached.providerRef, enabled: parsed.data.autopay === "on" })
  notify({
    userId: user.id,
    title: "Demo payment method saved",
    body: `Pre-authorized debit ····${attached.last4} is on file with the demo adapter. Nothing was charged.`,
    href: "/account/payments",
  })
  refresh(["/account/payments", "/inbox"])
  return { error: null, fieldErrors: {} }
}

export async function submitAutopay(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") return
  const tenantId = String(formData.get("tenantId") ?? "")
  const enabled = formData.get("autopay") === "on"
  const result = setAutopay(user.id, tenantId, enabled)
  if (!result.ok) return
  demoPayments.setAutopay({ providerRef: result.providerRef, enabled })
  notify({
    userId: user.id,
    title: enabled ? "Autopay scheduled (demo)" : "Autopay turned off",
    body: enabled
      ? "The demo adapter will not contact a bank. Autopay is a flag on the demo method only."
      : "Autopay is off. Open items stay on the ledger until you record a demo payment.",
    href: "/account/payments",
  })
  refresh(["/account/payments", "/inbox"])
}

export async function submitPayment(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") return
  const tenantId = String(formData.get("tenantId") ?? "")
  const preview = payDue(user.id, tenantId)
  if (!preview.ok) return
  const charge = demoPayments.collect({
    providerRef: preview.providerRef,
    amountCents: preview.amountCents,
    description: "Open rent and late fees",
  })
  notify({
    userId: user.id,
    title: "Demo payment recorded",
    body: `Reference ${charge.reference}. No card was charged.`,
    href: "/account/payments",
  })
  notifyMany(
    landlordIds(tenantId).map((id) => ({
      userId: id,
      title: "Demo payment posted",
      body: `${user.name} recorded a demo payment. Reference ${charge.reference}.`,
      href: "/landlord/ledger",
    })),
  )
  refresh(["/account/payments", "/landlord/ledger", "/inbox"])
}

const verificationSchema = z
  .object({
    country: z.enum(["Canada", "United States", "India", "United Kingdom"]),
    region: z.string().trim().min(2, "Enter a province, state, or region"),
    docType: z.enum(["aadhaar", "driving_licence"]),
    fileName: z.string().trim().max(180),
    faceName: z.string().trim().max(180),
  })
  .refine((value) => (value.country === "India" ? value.docType === "aadhaar" : value.docType === "driving_licence"), {
    message: "India uses Aadhaar in this demo. Everywhere else uses a driving licence.",
    path: ["docType"],
  })

export type VerifyState = {
  error: string | null
  result: { score: number; result: string } | null
}

export async function completeVerification(_prev: VerifyState, payload: {
  country: string
  region: string
  docType: string
  fileName: string
  faceName: string
}): Promise<VerifyState> {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return { error: "Switch to an applicant to run the demo check.", result: null }
  }
  const parsed = verificationSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the wizard.", result: null }
  }
  const simulated = simulateMatch(parsed.data)
  saveVerification({
    userId: user.id,
    country: parsed.data.country,
    region: parsed.data.region,
    docType: parsed.data.docType,
    fileName: parsed.data.fileName || null,
    faceName: parsed.data.faceName || null,
    score: simulated.score,
    result: simulated.result,
  })
  notify({
    userId: user.id,
    title: "Demo verification recorded",
    body: `Simulated ${simulated.result} at ${simulated.score.toFixed(2)}. No government API was called and no biometric template was stored.`,
    href: "/account/verify",
  })
  for (const tenantId of openApplicationTenants(user.id)) {
    notifyMany(
      landlordIds(tenantId).map((id) => ({
        userId: id,
        title: "Applicant finished demo verification",
        body: `${user.name} has a simulated ${simulated.result}. This is not a government identity check.`,
        href: "/landlord/applications",
      })),
    )
  }
  refresh(["/account/verify", "/landlord/applications", "/inbox"])
  return { error: null, result: simulated }
}

export async function markInboxRead() {
  const user = await getSessionUser()
  if (!user) return
  const { markAllRead } = await import("@/lib/db")
  markAllRead(user.id)
  refresh(["/inbox"])
}
