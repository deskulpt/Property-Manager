"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthProvider } from "@/lib/auth/provider"
import { isSeatRole, seatCapabilities } from "@/lib/auth/seats"
import { DEFAULT_PACKAGE, parsePackage } from "@/lib/auth/packages"
import {
  decideProposal,
  stubAutofillListing,
} from "@/lib/agentic/queue"
import {
  assessLateFees,
  assignJob,
  addCustomDomain,
  completeLandlordOnboarding,
  completeNonLandlordOnboarding,
  createApplication,
  createPendingAccount,
  createPropertyForLandlord,
  createVisitRequest,
  exportUserData,
  propertyForLandlord,
  recordConsentEvent,
  redactUserPersonalData,
  getPasswordHashForEmail,
  getUserByEmail,
  getTenantPackage,
  removeCustomDomain,
  verifyCustomDomain,
  createJob,
  createMarketDraft,
  acceptOccupantInvite,
  acknowledgeReminder,
  accrueInterest,
  completeDemoEnvelope,
  createAndSendEnvelope,
  createTicket,
  decideApplication,
  enqueueRentReminders,
  getInviteByToken,
  getUser,
  hasActiveLease,
  inviteLandlord,
  isPublicFormCountry,
  landlordIds,
  openApplicationTenants,
  payDue,
  publicFormCountries,
  transitionTicket,
  addFloorLevel,
  bindUnitMesh,
  saveBuildingModel,
  saveFloorPlan,
  saveFloorPlanDraft,
  saveHotspots,
  savePropertyPin,
  saveUnitMatterportUrl,
  unbindUnitMesh,
  saveLateFeeRule,
  saveVerification,
  setAutopay,
  setChecklistItem,
  setProviderApproval,
  setProviderVerified,
  setTenantDisplayCurrency,
  transitionJob,
  upsertLanguage,
  upsertMethod,
  addToCart,
  checkoutCart,
  saveShopRazorpaySettings,
  setShopSkuEnabled,
  getShopSettingsPublic,
  setTenantStatus,
  setTenantPackage,
  advanceIndicationStatus,
  attachAttributionToLandlord,
  createIndication,
  createReferrerFromSubmit,
  ensureReferrerForUser,
  getReferrerByCode,
  getReferrerByUserId,
  recordReferralAttribution,
} from "@/lib/db"
import { TRADES, type TicketCategory, type TicketStatus } from "@/lib/format"
import {
  isSelfServePlan,
  packageHasAskEasy,
  parsePlanId,
  planLabel,
  SUBSCRIBE_PATH,
} from "@/lib/plans"
import { t } from "@/lib/i18n"
import {
  isPropertySegment,
  leaseProfile,
  PROPERTY_SUBTYPES,
  type PropertySegment,
  warehouseAttributesFromColumns,
} from "@/lib/listing-schemas"
import { toE164, type DisplayCurrency, type PaymentMethodKind } from "@/lib/market"
import { MARKET_CHECKLIST_KEYS, type MarketChecklistKey } from "@/lib/market-checklist"
import { notify, notifyMany } from "@/lib/notifications"
import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/password"
import { demoOtpCode, requestDemoOtp, verifyDemoOtp } from "@/lib/otp"
import { demoPayments } from "@/lib/payments"
import { staffCapabilities } from "@/lib/permissions"
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE,
  normalizePhone,
  type IndicationStatus,
  type PropertyType,
} from "@/lib/referrals"
import { agentCanAccessTenant } from "@/lib/agent-context"
import {
  canImpersonate,
  canOpenConsole,
  deskPathForLevel,
  roleForOnboardingLevel,
  subscriptionAllowsDesk,
} from "@/lib/role-level"
import { sessionCookieOptions } from "@/lib/env"
import {
  ADMIN_SESSION_COOKIE,
  clearAgentTenantCookie,
  clearSessionCookies,
  getAdminSessionUser,
  getSessionUser,
  mintSessionValue,
  SESSION_COOKIE,
  setAdminSessionCookie,
  setAgentTenantCookie,
  setSessionCookie,
  setSessionUserId,
} from "@/lib/session"
import { translateEnglishCatalog, writeLocaleFile } from "@/lib/translate"
import { validateMapPin } from "@/lib/maps"
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


export type AuthFormState = {
  error?: string | null
  message?: string | null
  fieldErrors?: Record<string, string>
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a work email"),
  password: z.string().min(8, "Use at least 8 characters"),
})

/** Public signup — credentials only; role at /onboarding/role; L2 then /pricing/subscribe. */
export async function signupAccount(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (formData.get("consent") !== "on") {
    return {
      error: "Accept the privacy notice to continue.",
      fieldErrors: { consent: "Required" },
    }
  }
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }
  const policy = passwordPolicyError(parsed.data.password)
  if (policy) return { error: policy, fieldErrors: { password: policy } }
  const passwordHash = await hashPassword(parsed.data.password)
  const result = createPendingAccount({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  recordConsentEvent({
    userId: result.userId,
    email: parsed.data.email,
    purpose: "signup_privacy_terms",
    version: "dpdp-2023-v1",
  })
  await setSessionCookie(result.userId)
  {
    const jar = await cookies()
    jar.delete(ADMIN_SESSION_COOKIE)
  }
  notify({
    userId: result.userId,
    title: "Welcome to Easy Rental",
    body: "Choose your role to finish setting up your account.",
    href: "/onboarding/role",
  })
  refresh(["/", "/onboarding/role", "/inbox"])
  redirect("/onboarding/role")
}

/** @deprecated Prefer signupAccount — kept for import compatibility. */
export async function signupLandlord(
  prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return signupAccount(prev, formData)
}

const onboardingRoleSchema = z.object({
  level: z.coerce.number().int().min(2).max(5),
  company: z.string().trim().optional(),
  trade: z.string().trim().optional(),
  serviceArea: z.string().trim().optional(),
})

export async function completeOnboardingRole(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getSessionUser()
  if (!user) return { error: "Sign in to continue onboarding.", fieldErrors: {} }
  const parsed = onboardingRoleSchema.safeParse({
    level: formData.get("level"),
    company: formData.get("company") || undefined,
    trade: formData.get("trade") || undefined,
    serviceArea: formData.get("serviceArea") || undefined,
  })
  if (!parsed.success) {
    return { error: "Choose a role to continue.", fieldErrors: issues(parsed.error) }
  }
  const level = parsed.data.level as 2 | 3 | 4 | 5
  if (!roleForOnboardingLevel(level)) {
    return { error: "That role is not available for self-serve signup.", fieldErrors: {} }
  }
  if (level === 2) {
    const company = parsed.data.company?.trim() ?? ""
    if (company.length < 2) {
      return { error: "Enter your organisation name.", fieldErrors: { company: "Required" } }
    }
    const result = completeLandlordOnboarding({ userId: user.id, company })
    if (!result.ok) return { error: result.error, fieldErrors: {} }
    refresh(["/", SUBSCRIBE_PATH, "/landlord"])
    redirect(`${SUBSCRIBE_PATH}?from=onboard`)
  }
  const result = completeNonLandlordOnboarding({
    userId: user.id,
    level,
    company: parsed.data.company,
    trade: parsed.data.trade,
    serviceArea: parsed.data.serviceArea,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  refresh(["/", deskPathForLevel(level)])
  redirect(deskPathForLevel(level))
}

export type SubscribeFormState = {
  error?: string | null
  fieldErrors?: Record<string, string>
}

const subscribeSchema = z.object({
  plan: z.string().trim().min(1),
  seats: z.coerce.number().int().min(1).max(500).optional(),
})

/**
 * Demo purchase step for landlord listing plans (L2 onboard + /pricing CTAs).
 * Sets `tenants.package` — no live Razorpay charge in this slice.
 */
export async function activateSubscriptionPlan(
  _prev: SubscribeFormState,
  formData: FormData,
): Promise<SubscribeFormState> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return {
      error: "Sign in as a landlord admin to activate a plan.",
      fieldErrors: {},
    }
  }
  const parsed = subscribeSchema.safeParse({
    plan: formData.get("plan"),
    seats: formData.get("seats") || undefined,
  })
  if (!parsed.success) {
    return { error: "Choose a plan to continue.", fieldErrors: issues(parsed.error) }
  }
  const plan = parsePlanId(parsed.data.plan)
  if (!isSelfServePlan(plan)) {
    return {
      error: "Enterprise is sales-led — email hello@easyrental.space.",
      fieldErrors: { plan: "Not self-serve" },
    }
  }
  const seats = parsed.data.seats ?? 1
  const result = setTenantPackage(user.tenantId, plan)
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  const label = planLabel(result.package)
  notify({
    userId: user.id,
    title: `${label} plan active`,
    body:
      seats > 1
        ? `${label} activated for ${seats} listing seats (demo — billing not charged).`
        : `${label} activated (demo — proposed INR / year / active listing; billing not charged).`,
    href: "/landlord",
  })
  refresh(["/landlord", "/landlord/settings", "/pricing", SUBSCRIBE_PATH, "/inbox"])
  redirect("/landlord")
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter your email"),
  password: z.string().min(1, "Enter your password"),
})

export async function loginWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }
  const hash = getPasswordHashForEmail(parsed.data.email)
  const generic = { error: "Email or password is incorrect.", fieldErrors: {} }
  if (!hash) {
    // Constant-time-ish: still hash a dummy so timing is closer; never reveal fixture emails.
    await verifyPassword(parsed.data.password, "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV")
    return generic
  }
  const ok = await verifyPassword(parsed.data.password, hash)
  if (!ok) return generic
  const account = getUserByEmail(parsed.data.email)
  if (!account) return generic
  await setSessionCookie(account.id)
  if (canImpersonate(account.roleLevel)) {
    await setAdminSessionCookie(account.id)
  } else {
    const jar = await cookies()
    jar.delete(ADMIN_SESSION_COOKIE)
  }
  refresh(["/", "/landlord", "/inbox", "/cms", "/console", "/onboarding/role", SUBSCRIBE_PATH])
  if (!account.onboardingComplete || account.role === "pending") {
    redirect("/onboarding/role")
  }
  if (
    account.roleLevel === 2 &&
    !account.tenantIsDemo &&
    !subscriptionAllowsDesk(account.tenantStatus)
  ) {
    redirect(`${SUBSCRIBE_PATH}?from=onboard`)
  }
  if (canOpenConsole(account.roleLevel)) redirect("/console")
  redirect(deskPathForLevel(account.roleLevel))
}

export async function logoutSession() {
  await clearSessionCookies()
  revalidatePath("/", "layout")
  redirect("/")
}

export async function addLandlordDomain(formData: FormData) {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    return { ok: false as const, error: "Landlord admin session required." }
  }
  const result = addCustomDomain(user.tenantId, String(formData.get("hostname") ?? ""))
  if (!result.ok) return result
  refresh(["/landlord/settings"])
  return { ok: true as const, id: result.domain.id, hostname: result.domain.hostname }
}

export async function checkLandlordDomainDns(formData: FormData) {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    return { ok: false as const, error: "Landlord admin session required." }
  }
  const domainId = String(formData.get("domainId") ?? "")
  const observedTxt = String(formData.get("observedTxt") ?? "") || null
  const demoForce = formData.get("demoForce") === "1" || formData.get("demoForce") === "on"
  const result = verifyCustomDomain(user.tenantId, domainId, {
    demoForce,
    observedTxt,
  })
  if (!result.ok) return result
  refresh(["/landlord/settings"])
  return {
    ok: true as const,
    hostname: result.domain.hostname,
    status: result.domain.status,
  }
}

export async function removeLandlordDomain(formData: FormData) {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    return { ok: false as const, error: "Landlord admin session required." }
  }
  removeCustomDomain(user.tenantId, String(formData.get("domainId") ?? ""))
  refresh(["/landlord/settings"])
  return { ok: true as const }
}

export async function switchSession(userId: string) {
  const admin = await getAdminSessionUser()
  if (!admin || !canImpersonate(admin.roleLevel)) return
  const jar = await cookies()
  if (!userId || userId === "visitor") {
    // Restore L0/L1 staff identity; keep sticky bar unlocked.
    jar.set(SESSION_COOKIE, mintSessionValue(admin.id), sessionCookieOptions())
    await clearAgentTenantCookie()
    revalidatePath("/", "layout")
    return
  }
  const user = getUser(userId)
  if (!user || !user.isDemo) return
  jar.set(SESSION_COOKIE, mintSessionValue(user.id), sessionCookieOptions())
  if (user.role !== "managing_agent") {
    await clearAgentTenantCookie()
  }
  revalidatePath("/", "layout")
}

async function requireConsoleAdmin() {
  const session = await getSessionUser()
  if (!session || !canOpenConsole(session.roleLevel)) return null
  return session
}

export async function consoleSetTenantStatus(formData: FormData) {
  if (!(await requireConsoleAdmin())) return
  const tenantId = String(formData.get("tenantId") ?? "")
  const status = String(formData.get("status") ?? "")
  if (status !== "active" && status !== "suspended") return
  setTenantStatus(tenantId, status)
  refresh(["/console", "/console/tenants", "/console/pricing"])
}

export async function consoleSetTenantPackage(formData: FormData) {
  if (!(await requireConsoleAdmin())) return
  const tenantId = String(formData.get("tenantId") ?? "")
  const raw = String(formData.get("package") ?? "")
  const pkg = parsePlanId(raw)
  // Only accept known ladder ids (incl. growth / enterprise for L0 console).
  if (
    raw !== "starter" &&
    raw !== "basic" &&
    raw !== "growth" &&
    raw !== "pro" &&
    raw !== "enterprise" &&
    raw !== "portfolio"
  ) {
    return
  }
  setTenantPackage(tenantId, pkg)
  refresh(["/console", "/console/tenants", "/console/pricing", "/pricing"])
}

export async function consoleImpersonateTenant(formData: FormData) {
  const session = await getSessionUser()
  const admin = await getAdminSessionUser()
  if (!admin && !(session && canImpersonate(session.roleLevel))) return
  if (session && canImpersonate(session.roleLevel)) {
    await setAdminSessionCookie(session.id)
  }
  const userId = String(formData.get("userId") ?? "")
  await switchSession(userId)
  redirect("/landlord")
}

export async function consoleToggleShopSku(formData: FormData) {
  if (!(await requireConsoleAdmin())) return
  const tenantId = String(formData.get("tenantId") ?? "")
  const skuId = String(formData.get("skuId") ?? "")
  const enabled = String(formData.get("enabled") ?? "") === "1"
  setShopSkuEnabled(tenantId, skuId, enabled)
  refresh(["/console/shops"])
}

export async function setAgentLandlordForm(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "managing_agent") return
  const tenantId = String(formData.get("tenantId") ?? "")
  if (!tenantId || !agentCanAccessTenant(user.id, tenantId)) return
  await setAgentTenantCookie(tenantId)
  revalidatePath("/agent", "layout")
  redirect("/agent")
}

const applicationSchema = z.object({
  unitId: z.string().min(1),
  company: z.string().trim().min(2, "Enter a name or company"),
  contactName: z.string().trim().min(2, "Enter a contact name"),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter an email"),
  intendedUse: z.string().trim().min(3, "Add a short note on intended use"),
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

export type CreateListingState = {
  error: string | null
  fieldErrors?: Record<string, string>
}

export async function createListingProperty(
  _prev: CreateListingState,
  formData: FormData,
): Promise<CreateListingState> {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    return { error: "Switch to a landlord admin to create listings.", fieldErrors: {} }
  }
  const segmentRaw = String(formData.get("segment") ?? "")
  if (!isPropertySegment(segmentRaw)) {
    return { error: "Pick a valid segment.", fieldErrors: { segment: "Invalid segment" } }
  }
  const segment = segmentRaw as PropertySegment
  const subtype = String(formData.get("subtype") ?? "")
  if (!(PROPERTY_SUBTYPES[segment] as readonly string[]).includes(subtype)) {
    return { error: "Pick a subtype for that segment.", fieldErrors: { subtype: "Invalid subtype" } }
  }
  const name = String(formData.get("name") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()
  const area = String(formData.get("area") ?? "").trim()
  const cityLine = String(formData.get("cityLine") ?? "").trim()
  const unitCode = String(formData.get("unitCode") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const sqft = Number(formData.get("sqft"))
  if (!name || !address || !area || !cityLine || !unitCode || !description || !Number.isFinite(sqft) || sqft <= 0) {
    return { error: "Fill property name, address, area, city line, unit code, area SF, and description." }
  }
  const profile = leaseProfile(segment)
  let rateBasis: "per_sqft_month" | "flat_month" = profile.rateBasisDefault
  let ratePsf = 0
  let rentAmountMinor: number | null = null
  let attributes: Record<string, unknown> = {}
  let clearHeight = ""
  let docks = 0
  let driveIns = 0
  let power = ""
  let bhk: number | null = null
  let carpetSqft: number | null = null
  let securityDepositMonths: number | null = profile.defaultDepositMonths
  let maintenanceMinor: number | null = null

  if (segment === "warehouse") {
    ratePsf = Number(formData.get("ratePsf"))
    if (!Number.isFinite(ratePsf) || ratePsf <= 0) {
      return { error: "Enter a positive ₹/SF rate.", fieldErrors: { ratePsf: "Required" } }
    }
    clearHeight = String(formData.get("clearHeight") ?? "").trim() || "—"
    docks = Number(formData.get("docks") ?? 0) || 0
    driveIns = Number(formData.get("driveIns") ?? 0) || 0
    power = String(formData.get("power") ?? "").trim() || "—"
    attributes = warehouseAttributesFromColumns({
      clearHeight,
      docks,
      driveIns,
      power,
    })
  } else {
    const monthly = Number(formData.get("monthlyRent"))
    if (!Number.isFinite(monthly) || monthly <= 0) {
      return { error: "Enter monthly rent in ₹.", fieldErrors: { monthlyRent: "Required" } }
    }
    rentAmountMinor = Math.round(monthly * 100)
    rateBasis = "flat_month"
    carpetSqft = Number(formData.get("carpetSqft"))
    if (!Number.isFinite(carpetSqft) || carpetSqft <= 0) carpetSqft = sqft
    if (segment === "residential") {
      bhk = Number(formData.get("bhk")) || 1
      const furnishing = String(formData.get("furnishing") ?? "semi")
      securityDepositMonths = Number(formData.get("depositMonths")) || profile.defaultDepositMonths
      const maintenance = Number(formData.get("maintenance") ?? 0)
      maintenanceMinor = Number.isFinite(maintenance) && maintenance > 0 ? Math.round(maintenance * 100) : null
      attributes = {
        bhk,
        furnishing: furnishing === "fully" || furnishing === "unfurnished" ? furnishing : "semi",
        societyAmenities: [],
      }
    } else {
      attributes = {
        carpetSqft,
        superBuiltUpSqft: sqft,
        frontageFt: Number(formData.get("frontageFt")) || undefined,
        floor: String(formData.get("floor") ?? "").trim() || undefined,
        mallName: String(formData.get("mallName") ?? "").trim() || undefined,
        fitOut: (() => {
          const raw = String(formData.get("fitOut") ?? "")
          if (raw === "fitted" || raw === "warm_shell" || raw === "bare_shell") return raw
          return "bare_shell" as const
        })(),
      }
    }
  }

  const result = createPropertyForLandlord({
    tenantId: user.tenantId,
    name,
    address,
    area,
    cityLine,
    segment,
    subtype,
    totalSqft: sqft,
    unit: {
      code: unitCode,
      description,
      sqft,
      ratePsf,
      rateBasis,
      rentAmountMinor,
      clearHeight,
      docks,
      driveIns,
      power,
      attributes: attributes as import("@/lib/listing-schemas").UnitAttributes,
      bhk,
      carpetSqft,
      securityDepositMonths,
      maintenanceMinor,
      gstApplicable: profile.gstOnRent,
    },
  })
  if (!result.ok) return { error: result.error }
  refresh(["/landlord/properties", `/landlord/properties/${result.propertyId}`, "/listings", "/properties"])
  redirect(`/landlord/properties/${result.propertyId}`)
}


const visitSchema = z.object({
  unitId: z.string().min(1),
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter an email"),
  phone: z.string().trim().min(8, "Enter a phone number"),
  note: z.string().trim().max(1000).optional(),
  visitType: z.enum(["in_person", "virtual"]),
  preferredAt: z.string().trim().optional(),
})

export type VisitFormState = {
  ok?: boolean
  error?: string | null
  fieldErrors?: Record<string, string>
}

export async function requestVisit(
  _prev: VisitFormState,
  formData: FormData,
): Promise<VisitFormState> {
  const phoneRaw = String(formData.get("phone") ?? "").trim()
  const digits = phoneRaw.replace(/\D/g, "")
  const phone =
    (phoneRaw.startsWith("+") ? phoneRaw.replace(/\s/g, "") : null) ||
    toE164("+91", digits) ||
    phoneRaw
  const parsed = visitSchema.safeParse({
    unitId: formData.get("unitId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone,
    note: formData.get("note") ?? "",
    visitType: formData.get("visitType") || "in_person",
    preferredAt: formData.get("preferredAt") || "",
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }
  const result = createVisitRequest({
    unitId: parsed.data.unitId,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    note: parsed.data.note ?? "",
    visitType: parsed.data.visitType,
    preferredAt: parsed.data.preferredAt || null,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  notifyMany(
    landlordIds(result.tenantId).map((id) => ({
      userId: id,
      title: "Visit requested",
      body: `${parsed.data.name} asked to visit Unit ${result.unitCode} at ${result.propertyName} (${parsed.data.visitType.replace("_", "-")}).`,
      href: `/properties/${result.propertySlug}/units/${result.unitCode}`,
    })),
  )
  refresh([
    `/properties/${result.propertySlug}`,
    `/properties/${result.propertySlug}/units/${result.unitCode}`,
    "/inbox",
    "/landlord",
  ])
  return { ok: true }
}

const visitRequestSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  appointmentTypeId: z.string().min(1),
  startsAt: z.string().min(1),
  guestName: z.string().trim().min(2, "Enter your name"),
  guestEmail: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a work email"),
  guestPhone: z.string().trim().min(8, "Enter a mobile number"),
  notes: z.string().trim().max(1000).optional(),
  meetingUrl: z.string().trim().optional(),
})

export type VisitBookState = {
  error: string | null
  fieldErrors: Record<string, string>
  ok?: boolean
}

export async function submitVisitRequest(
  _prev: VisitBookState,
  formData: FormData,
): Promise<VisitBookState> {
  const user = await getSessionUser()
  const phoneRaw = String(formData.get("guestPhone") ?? "").trim()
  const phone = phoneRaw.startsWith("+") ? phoneRaw : toE164("+91", phoneRaw) ?? phoneRaw
  const parsed = visitRequestSchema.safeParse({
    propertyId: formData.get("propertyId"),
    unitId: String(formData.get("unitId") ?? "") || undefined,
    appointmentTypeId: formData.get("appointmentTypeId"),
    startsAt: formData.get("startsAt"),
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    guestPhone: phone,
    notes: formData.get("notes") ?? "",
    meetingUrl: String(formData.get("meetingUrl") ?? ""),
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }

  const { requestAppointment, visitNoticeForRequest } = await import("@/lib/visits")
  const result = requestAppointment({
    propertyId: parsed.data.propertyId,
    unitId: parsed.data.unitId ?? null,
    appointmentTypeId: parsed.data.appointmentTypeId,
    startsAt: parsed.data.startsAt,
    guestName: parsed.data.guestName,
    guestEmail: parsed.data.guestEmail,
    guestPhone: parsed.data.guestPhone,
    notes: parsed.data.notes ?? "",
    meetingUrl: parsed.data.meetingUrl || null,
    applicantId: user?.role === "applicant" ? user.id : null,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }

  notifyMany(
    visitNoticeForRequest({
      tenantId: result.tenantId,
      propertyName: result.propertyName,
      propertySlug: result.propertySlug,
      typeName: result.typeName,
      startsAt: result.startsAt,
      endsAt: result.endsAt,
      guestName: parsed.data.guestName,
    }),
  )
  if (user?.role === "applicant") {
    notify({
      userId: user.id,
      title: "Visit requested",
      body: `Your ${result.typeName} at ${result.propertyName} is waiting for landlord confirmation.`,
      href: "/account",
    })
  }
  refresh([
    `/properties/${result.propertySlug}`,
    `/properties/${result.propertySlug}/book`,
    "/landlord/visits",
    "/landlord",
    "/inbox",
    "/account",
  ])
  redirect(
    `/properties/${result.propertySlug}/book?notice=${encodeURIComponent("Visit requested. The landlord will confirm or propose another slot.")}`,
  )
}

export async function reviewVisit(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const appointmentId = String(formData.get("appointmentId") ?? "")
  const decision = String(formData.get("decision") ?? "")
  const allowed = ["confirmed", "declined", "cancelled", "completed", "no_show"] as const
  if (!allowed.includes(decision as (typeof allowed)[number])) return

  const { transitionAppointment } = await import("@/lib/visits")
  const result = transitionAppointment(
    user.tenantId,
    appointmentId,
    decision as (typeof allowed)[number],
    "landlord",
  )
  if (!result.ok) return

  const appt = result.appointment
  const verb =
    decision === "confirmed"
      ? "confirmed"
      : decision === "declined"
        ? "declined"
        : decision === "cancelled"
          ? "cancelled"
          : decision === "completed"
            ? "marked completed"
            : "marked no-show"
  if (appt.applicantId) {
    notify({
      userId: appt.applicantId,
      title: `Visit ${decision === "no_show" ? "no-show" : decision === "completed" ? "completed" : decision}`,
      body: `${user.tenantName ?? "Landlord"} ${verb} your ${appt.typeName} at ${appt.propertyName}.`,
      href: `/properties/${appt.propertySlug}`,
    })
  }
  notifyMany(
    landlordIds(user.tenantId)
      .filter((id) => id !== user.id)
      .map((id) => ({
        userId: id,
        title: `Visit ${decision}`,
        body: `${appt.guestName} · ${appt.typeName} · ${appt.propertyName}.`,
        href: "/landlord/visits",
      })),
  )
  refresh(["/landlord/visits", "/landlord", "/inbox", `/properties/${appt.propertySlug}/book`])
}

export async function rescheduleVisit(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const appointmentId = String(formData.get("appointmentId") ?? "")
  const startsAt = String(formData.get("startsAt") ?? "")
  const meetingUrl = String(formData.get("meetingUrl") ?? "") || null
  if (!appointmentId || !startsAt) return

  const { rescheduleAppointment } = await import("@/lib/visits")
  const result = rescheduleAppointment(user.tenantId, appointmentId, startsAt, meetingUrl)
  if (!result.ok) return

  notifyMany(
    landlordIds(result.tenantId).map((id) => ({
      userId: id,
      title: "Visit rescheduled",
      body: `A visit at ${result.propertyName} moved to a new slot.`,
      href: "/landlord/visits",
    })),
  )
  refresh(["/landlord/visits", "/inbox", `/properties/${result.propertySlug}/book`])
}

export async function addAvailabilityWindow(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const { upsertAvailabilityWindow } = await import("@/lib/visits")
  const result = upsertAvailabilityWindow({
    tenantId: user.tenantId,
    propertyId: String(formData.get("propertyId") ?? ""),
    weekday: Number(formData.get("weekday") ?? -1),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
  })
  if (!result.ok) return
  refresh(["/landlord/visits"])
}

export async function removeAvailabilityWindow(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const { deleteAvailabilityWindow } = await import("@/lib/visits")
  deleteAvailabilityWindow(user.tenantId, String(formData.get("windowId") ?? ""))
  refresh(["/landlord/visits"])
}

export async function togglePropertyVisits(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const { setPropertyVisitsEnabled } = await import("@/lib/visits")
  const enabled = formData.get("enabled") === "1"
  const propertyId = String(formData.get("propertyId") ?? "")
  const result = setPropertyVisitsEnabled(user.tenantId, propertyId, enabled)
  if (!result.ok) return
  refresh(["/landlord/visits", "/properties"])
}

export async function reviewApplication(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const decision = formData.get("decision") === "approved" ? "approved" : "denied"
  const applicationId = String(formData.get("applicationId") ?? "")
  const result = decideApplication(user.tenantId, applicationId, decision)
  if (!result.ok) return
  const verb = decision === "approved" ? "approved" : "declined"
  const application = result.application
  const inviteToken = "inviteToken" in result ? result.inviteToken : null
  const deniedIds = "deniedIds" in result ? result.deniedIds : []
  notify({
    userId: application.applicantId,
    title: `Application ${verb}`,
    body:
      decision === "approved" && inviteToken
        ? `${user.tenantName ?? "Your landlord"} approved Unit ${application.unitCode}. Open your portal invite to unlock dues and tickets.`
        : `${user.tenantName ?? "Your landlord"} ${verb} the application for Unit ${application.unitCode}.`,
    href:
      decision === "approved" && inviteToken
        ? `/portal/invite/${inviteToken}`
        : decision === "approved"
          ? "/account/payments"
          : "/account",
  })
  for (const applicantId of deniedIds) {
    notify({
      userId: applicantId,
      title: "Application declined",
      body: `Unit ${application.unitCode} was leased to another applicant.`,
      href: "/account",
    })
  }
  refresh([
    "/",
    "/properties",
    `/properties/${application.propertySlug}`,
    `/properties/${application.propertySlug}/units/${application.unitCode}`,
    "/account",
    "/account/payments",
    "/landlord",
    "/landlord/applications",
    "/landlord/ledger",
    "/landlord/tickets",
    "/landlord/esign",
    "/portal",
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

const planDraftPayloadSchema = z.object({
  propertyId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  floorId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  draftJson: z.string().min(2).max(200_000),
})

/** Landlord-only: save validated unit-plan creator JSON on a floor. */
export async function savePlanDraftAction(input: {
  propertyId: string
  floorId: string
  draftJson: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Landlord session required." }
  }
  const parsed = planDraftPayloadSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid plan draft payload." }

  // Validate structure with the shared schema (no HTML / eval).
  const { planDraftSchema } = await import("@/lib/plan-draft")
  let draftUnknown: unknown
  try {
    draftUnknown = JSON.parse(parsed.data.draftJson)
  } catch {
    return { ok: false, error: "Plan draft must be valid JSON." }
  }
  const draft = planDraftSchema.safeParse(draftUnknown)
  if (!draft.success) return { ok: false, error: "Plan draft failed validation." }

  const result = saveFloorPlanDraft(
    user.tenantId,
    parsed.data.propertyId,
    parsed.data.floorId,
    JSON.stringify(draft.data),
  )
  if (!result.ok) return { ok: false, error: result.error }
  refresh([
    `/properties/${result.slug}`,
    `/landlord/properties/${parsed.data.propertyId}`,
  ])
  return { ok: true }
}

const addFloorPayloadSchema = z.object({
  propertyId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().trim().min(1).max(40),
})

/** Landlord-only: append a floor level for stack + plan creator. */
export async function addFloorLevelAction(input: {
  propertyId: string
  label: string
}): Promise<
  | { ok: true; floorId: string; label: string; levelIndex: number }
  | { ok: false; error: string }
> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Landlord session required." }
  }
  const parsed = addFloorPayloadSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid floor label." }
  const result = addFloorLevel(user.tenantId, parsed.data.propertyId, parsed.data.label)
  if (!result.ok) return { ok: false, error: result.error }
  refresh([
    `/properties/${result.slug}`,
    `/landlord/properties/${parsed.data.propertyId}`,
  ])
  return {
    ok: true,
    floorId: result.floorId,
    label: result.label,
    levelIndex: result.levelIndex,
  }
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
  if (!/^[a-zA-Z0-9_-]+$/.test(propertyId)) return
  const owned = propertyForLandlord(user.tenantId, propertyId)
  if (!owned) return
  const file = formData.get("floorPlan")
  if (!(file instanceof File) || file.size === 0) return
  if (file.size > 5_000_000) return
  const ext = TYPES.get(file.type)
  if (!ext) return
  const { getObjectStore } = await import("@/lib/object-store")
  const bytes = Buffer.from(await file.arrayBuffer())
  const stored = await getObjectStore().put({
    tenantId: user.tenantId,
    kind: "floorplans",
    ext,
    bytes,
    contentType: file.type || "application/octet-stream",
  })
  const result = saveFloorPlan(user.tenantId, propertyId, stored.publicPath)
  if (!result.ok) return
  refresh([`/properties/${result.slug}`, `/landlord/properties/${propertyId}`])
}

export async function submitBuildingModel(formData: FormData): Promise<{
  ok: boolean
  error: string
}> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin first." }
  }
  const propertyId = String(formData.get("propertyId") ?? "")
  if (!/^[a-zA-Z0-9_-]+$/.test(propertyId)) {
    return { ok: false, error: "Building not found in this organisation." }
  }
  const owned = propertyForLandlord(user.tenantId, propertyId)
  if (!owned) return { ok: false, error: "Building not found in this organisation." }
  const file = formData.get("buildingModel")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a GLB, glTF, IFC, or OBJ file." }
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  const { rejectReasonForModel, sniffModelKind, MODEL_CONTENT_TYPES } = await import(
    "@/lib/model-sniff"
  )
  const reject = rejectReasonForModel(bytes, file.size)
  if (reject) return { ok: false, error: reject }
  const kind = sniffModelKind(bytes)!
  const { getObjectStore } = await import("@/lib/object-store")
  const stored = await getObjectStore().put({
    tenantId: user.tenantId,
    kind: "models",
    ext: kind,
    bytes,
    contentType: MODEL_CONTENT_TYPES[kind],
  })
  const result = saveBuildingModel(
    user.tenantId,
    propertyId,
    stored.publicPath,
    kind === "gltf" ? "gltf" : kind,
  )
  if (!result.ok) return { ok: false, error: result.error }
  refresh([`/properties/${result.slug}`, `/landlord/properties/${propertyId}`])
  return { ok: true, error: "" }
}

export async function bindMeshAction(input: {
  propertyId: string
  unitId: string
  meshKey: string
  meshKind: "gltf_name" | "ifc_express_id" | "obj_name"
}): Promise<{ ok: boolean; error: string }> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin first." }
  }
  const result = bindUnitMesh({
    tenantId: user.tenantId,
    propertyId: input.propertyId,
    unitId: input.unitId,
    meshKey: input.meshKey,
    meshKind: input.meshKind,
  })
  if (!result.ok) return { ok: false, error: result.error }
  refresh([`/properties/${result.slug}`, `/landlord/properties/${input.propertyId}`])
  return { ok: true, error: "" }
}

export async function unbindMeshAction(input: {
  propertyId: string
  meshKey: string
}): Promise<{ ok: boolean; error: string }> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin first." }
  }
  const result = unbindUnitMesh(user.tenantId, input.propertyId, input.meshKey)
  if (!result.ok) return { ok: false, error: result.error }
  refresh([`/properties/${result.slug}`, `/landlord/properties/${input.propertyId}`])
  return { ok: true, error: "" }
}

export async function submitUnitMatterport(input: {
  unitId: string
  url: string
}): Promise<{ ok: boolean; error: string }> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin first." }
  }
  const { matterportEmbedSrc } = await import("@/lib/matterport")
  const trimmed = input.url.trim()
  const normalised = trimmed === "" ? null : matterportEmbedSrc(trimmed)
  if (trimmed && !normalised) {
    return {
      ok: false,
      error: "Use an https://my.matterport.com/show/?m=… URL (Discover /space/ links are normalised).",
    }
  }
  const result = saveUnitMatterportUrl(user.tenantId, input.unitId, normalised)
  if (!result.ok) return { ok: false, error: result.error }
  if (result.slug && result.propertyId) {
    refresh([
      `/properties/${result.slug}`,
      `/properties/${result.slug}/units`,
      `/landlord/properties/${result.propertyId}`,
    ])
  }
  return { ok: true, error: "" }
}

export async function submitPropertyPin(formData: FormData): Promise<{
  ok: boolean
  error: string
  message: string
}> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin first.", message: "" }
  }
  const propertyId = String(formData.get("propertyId") ?? "")
  const building = validateMapPin(formData.get("latitude"), formData.get("longitude"))
  if (!building.ok) return { ok: false, error: building.error, message: "" }

  const entranceRawLat = formData.get("entranceLatitude")
  const entranceRawLng = formData.get("entranceLongitude")
  const entranceEmpty =
    (entranceRawLat == null || String(entranceRawLat).trim() === "") &&
    (entranceRawLng == null || String(entranceRawLng).trim() === "")
  let entranceLatitude: number | null = null
  let entranceLongitude: number | null = null
  if (!entranceEmpty) {
    const entrance = validateMapPin(entranceRawLat, entranceRawLng)
    if (!entrance.ok) {
      return { ok: false, error: `Entrance pin: ${entrance.error}`, message: "" }
    }
    entranceLatitude = entrance.latitude
    entranceLongitude = entrance.longitude
  }

  const entranceLabelRaw = String(formData.get("entranceLabel") ?? "").trim()
  const result = savePropertyPin(user.tenantId, propertyId, {
    latitude: building.latitude,
    longitude: building.longitude,
    entranceLatitude,
    entranceLongitude,
    entranceLabel: entranceLabelRaw || null,
    hideExactPin: formData.get("hideExactPin") === "1",
  })
  if (!result.ok) return { ok: false, error: result.error, message: "" }
  refresh([
    "/",
    "/listings",
    `/properties/${result.slug}`,
    `/landlord/properties/${propertyId}`,
  ])
  return {
    ok: true,
    error: "",
    message: building.latitude == null ? "Map pin cleared." : "Map pin saved.",
  }
}

export async function submitLateFeeRule(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const parsed = z
    .object({
      graceDays: z.coerce.number().int().min(0).max(60),
      flatRupees: z.coerce.number().min(0).max(10_000_000),
      percent: z.coerce.number().min(0).max(100),
    })
    .safeParse({
      graceDays: formData.get("graceDays"),
      flatRupees: formData.get("flatRupees") ?? formData.get("flatDollars"),
      percent: formData.get("percent"),
    })
  if (!parsed.success) return
  saveLateFeeRule(user.tenantId, {
    graceDays: parsed.data.graceDays,
    flatCents: Math.round(parsed.data.flatRupees * 100),
    percentBps: Math.round(parsed.data.percent * 100),
  })
  refresh(["/landlord/ledger", "/account/payments"])
}

export async function submitDisplayCurrency(formData: FormData): Promise<{
  ok: boolean
  error: string
  currency: DisplayCurrency | null
}> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin in the demo header first.", currency: null }
  }
  const currency = String(formData.get("displayCurrency") ?? "") as DisplayCurrency
  if (!["INR", "USD", "CAD", "GBP"].includes(currency)) {
    return { ok: false, error: "Choose INR, USD, CAD, or GBP.", currency: null }
  }
  setTenantDisplayCurrency(user.tenantId, currency)
  notify({
    userId: user.id,
    title: "Display currency updated",
    body:
      currency === "INR"
        ? "Amounts show in INR only. The ledger charge currency stays INR."
        : `Amounts now show ${currency} with the INR charge beside them. Demo FX table only — not a live rate.`,
    href: "/landlord/settings",
  })
  revalidatePath("/", "layout")
  return { ok: true, error: "", currency }
}

export type OtpState = {
  error: string | null
  message: string | null
  demoCode: string | null
  phoneE164: string | null
  verified: boolean
}

export async function submitRequestOtp(_prev: OtpState, formData: FormData): Promise<OtpState> {
  const user = await getSessionUser()
  if (!user) {
    return { error: "Pick a demo identity first.", message: null, demoCode: null, phoneE164: null, verified: false }
  }
  const countryCode = String(formData.get("countryCode") ?? "")
  const national = String(formData.get("national") ?? "")
  const e164 = toE164(countryCode, national)
  if (!e164) {
    return {
      error: "Enter a valid number for that country code (E.164).",
      message: null,
      demoCode: null,
      phoneE164: null,
      verified: false,
    }
  }
  const result = await requestDemoOtp(user.id, e164)
  if (!result.ok) {
    return { error: result.error, message: null, demoCode: null, phoneE164: null, verified: false }
  }
  return {
    error: null,
    message: result.labelledDemo
      ? `OTP queued via ${result.provider} (test mode) to ${result.phoneE164}.`
      : `OTP sent to ${result.phoneE164}.`,
    demoCode: result.demoCode,
    phoneE164: result.phoneE164,
    verified: false,
  }
}

export async function submitVerifyOtp(_prev: OtpState, formData: FormData): Promise<OtpState> {
  const user = await getSessionUser()
  if (!user) {
    return { error: "Pick a demo identity first.", message: null, demoCode: null, phoneE164: null, verified: false }
  }
  const code = String(formData.get("code") ?? "")
  const result = verifyDemoOtp(user.id, code)
  if (!result.ok) {
    return {
      error: result.error,
      message: null,
      demoCode: demoOtpCode(),
      phoneE164: null,
      verified: false,
    }
  }
  notify({
    userId: user.id,
    title: "Phone verified (demo OTP)",
    body: `${result.phoneE164} is saved on your profile. No SMS was sent.`,
    href: "/account",
  })
  // Client refreshes after reading the success state so the banner is not wiped.
  return {
    error: null,
    message: `Verified ${result.phoneE164}.`,
    demoCode: null,
    phoneE164: result.phoneE164,
    verified: true,
  }
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
      kind: z.enum(["upi", "enach"]),
      last4: z.string().regex(/^\d{4}$/, "Enter the last 4 digits of the VPA or mandate."),
      autopay: z.string().optional(),
    })
    .safeParse({
      tenantId: formData.get("tenantId"),
      kind: formData.get("kind") ?? "upi",
      last4: formData.get("last4"),
      autopay: formData.get("autopay") ?? "",
    })
  if (!parsed.success) return { error: "Check the payment method.", fieldErrors: issues(parsed.error) }
  const kind = parsed.data.kind as PaymentMethodKind
  const attached = demoPayments.attachMethod({
    userId: user.id,
    tenantId: parsed.data.tenantId,
    kind,
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
    body: `${attached.brand} ····${attached.last4} is on file. Demo adapter only — no NPCI or bank call.`,
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
    body: `Reference ${charge.reference}. Demo UPI / eNACH only — no bank debit.`,
    href: "/account/payments",
  })
  notifyMany(
    landlordIds(tenantId).map((id) => ({
      userId: id,
      title: "Demo payment posted",
      body: `${user.name} recorded a demo payment (INR). Reference ${charge.reference}.`,
      href: "/landlord/ledger",
    })),
  )
  refresh(["/account/payments", "/landlord/ledger", "/inbox"])
}

const verificationSchema = z.object({
  country: z.string().trim().min(2),
  region: z.string().trim().min(2, "Enter a province, state, or region"),
  docType: z.enum(["kyc_provider", "driving_licence"]),
  fileName: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9._:-]+$/, "Use a provider reference id (letters, numbers, . _ : -)"),
  faceName: z.string().trim().max(180),
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
  if (!isPublicFormCountry(parsed.data.country)) {
    return {
      error: "That country is not offered yet. Finish the next-market checklist first.",
      result: null,
    }
  }
  const isIndia = parsed.data.country === "India" || parsed.data.country === "IN"
  if (isIndia && parsed.data.docType !== "kyc_provider") {
    return { error: "India uses a licensed KYC provider reference in this demo (no Aadhaar images).", result: null }
  }
  if (!isIndia && parsed.data.docType !== "driving_licence") {
    return { error: "Non-India markets use a driving licence reference in this demo.", result: null }
  }
  // Refuse obvious Aadhaar number patterns in free-text refs.
  if (/\b\d{4}\s?\d{4}\s?\d{4}\b/.test(parsed.data.fileName)) {
    return { error: "Do not enter an Aadhaar number. Use a provider reference only.", result: null }
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

export type InviteState = { error: string | null; notice: string | null }

export async function submitLandlordInvite(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!user || !caps?.inviteLandlord) {
    return { error: "Only Super Admins and Account Managers can invite landlords.", notice: null }
  }
  const schema = z.object({
    companyName: z.string().trim().min(2, "Enter the company name"),
    city: z.string().trim().min(2, "Enter a city"),
    adminName: z.string().trim().min(2, "Enter the admin’s name"),
    adminEmail: z
      .string()
      .trim()
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a work email"),
  })
  const parsed = schema.safeParse({
    companyName: formData.get("companyName"),
    city: formData.get("city"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
  })
  if (!parsed.success) {
    return { error: Object.values(issues(parsed.error))[0] ?? "Check the form.", notice: null }
  }
  const result = inviteLandlord(parsed.data)
  if (!result.ok) return { error: result.error, notice: null }
  notify({
    userId: result.userId,
    title: "Welcome to Easy Rental",
    body: `${result.companyName} is on the platform. Switch to this identity in the demo header to open the landlord desk.`,
    href: "/landlord",
  })
  notify({
    userId: user.id,
    title: "Landlord invited",
    body: `${parsed.data.adminName} at ${result.companyName} can sign in from the demo switcher.`,
    href: "/cms/landlords",
  })
  refresh(["/", "/cms", "/cms/landlords", "/inbox"])
  return {
    error: null,
    notice: `${result.companyName} is ready. Pick ${parsed.data.adminName} in the demo header.`,
  }
}

export async function submitProviderVerify(formData: FormData) {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!user || !caps?.verifyProvider) return
  const providerId = String(formData.get("providerId") ?? "")
  const verified = formData.get("verified") !== "0"
  const result = setProviderVerified(providerId, verified)
  if (!result.ok) return
  notify({
    userId: providerId,
    title: verified ? "Provider verified" : "Verification removed",
    body: verified
      ? "Easy Rental marked you verified. A landlord can now approve you for their area."
      : "Your verified flag was cleared by platform staff.",
    href: "/provider",
  })
  refresh(["/cms", "/cms/providers", "/landlord/providers", "/provider", "/inbox"])
}

export async function submitPlatformApproval(formData: FormData) {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!user || !caps?.approveProvider) return
  const providerId = String(formData.get("providerId") ?? "")
  const tenantId = String(formData.get("tenantId") ?? "")
  const status = formData.get("status") === "rejected" ? "rejected" : "approved"
  const result = setProviderApproval(tenantId, providerId, status)
  if (!result.ok) return
  notify({
    userId: providerId,
    title: status === "approved" ? "Approved for a landlord" : "Landlord approval removed",
    body:
      status === "approved"
        ? "Platform staff approved you for assignments with a landlord in your service area."
        : "Platform staff rejected an approval for one landlord.",
    href: "/provider",
  })
  refresh(["/cms", "/cms/providers", "/landlord/providers", "/landlord/jobs", "/provider", "/inbox"])
}

export type MarketFormState = { error: string | null; ok: boolean }

export async function submitCreateMarketDraft(
  _prev: MarketFormState,
  formData: FormData,
): Promise<MarketFormState> {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!caps?.manageMarkets) {
    return { error: "Only a Super Admin can start a draft market.", ok: false }
  }
  const result = createMarketDraft({
    isoCode: String(formData.get("isoCode") ?? ""),
    name: String(formData.get("name") ?? ""),
  })
  if (!result.ok) return { error: result.error, ok: false }
  notify({
    userId: user!.id,
    title: "Draft market started",
    body: "Finish every checklist row before this country appears on public forms.",
    href: `/cms/markets/${result.id}`,
  })
  refresh(["/cms/markets", "/account/verify", "/inbox"])
  redirect(`/cms/markets/${result.id}`)
}

export async function submitChecklistItem(formData: FormData) {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!caps?.manageMarkets) return
  const draftId = String(formData.get("draftId") ?? "")
  const itemKey = String(formData.get("itemKey") ?? "") as MarketChecklistKey
  if (!MARKET_CHECKLIST_KEYS.includes(itemKey)) return
  const done = formData.get("done") === "1"
  const notes = String(formData.get("notes") ?? "")
  setChecklistItem(draftId, itemKey, { done, notes })
  refresh(["/cms/markets", `/cms/markets/${draftId}`, "/account/verify"])
}

export type LanguageFormState = { error: string | null; message: string | null }

export async function submitAddLanguage(
  _prev: LanguageFormState,
  formData: FormData,
): Promise<LanguageFormState> {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!caps?.manageLanguages) {
    return { error: "Only a Super Admin can add a language.", message: null }
  }
  const code = String(formData.get("code") ?? "")
  const name = String(formData.get("name") ?? "")
  const translated = await translateEnglishCatalog(code)
  if (translated.ok) {
    writeLocaleFile(code, translated.messages)
    const saved = upsertLanguage({
      code,
      name,
      status: "ready",
      waitingReason: null,
    })
    if (!saved.ok) return { error: saved.error, message: null }
    notify({
      userId: user!.id,
      title: "Language added",
      body: `${name} (${code}) translated from English via Google Cloud Translation API.`,
      href: "/cms/languages",
    })
    refresh(["/cms/languages", "/inbox"])
    return { error: null, message: t("cms.languages.ready") }
  }
  if (translated.waiting) {
    const saved = upsertLanguage({
      code,
      name,
      status: "waiting_for_key",
      waitingReason: translated.reason,
    })
    if (!saved.ok) return { error: saved.error, message: null }
    notify({
      userId: user!.id,
      title: "Language saved — translation waiting",
      body: translated.reason,
      href: "/cms/languages",
    })
    refresh(["/cms/languages", "/inbox"])
    return { error: null, message: t("cms.languages.waiting") }
  }
  return { error: translated.reason, message: null }
}

/** Used by the verify page to pass countries without importing db in the client. */
export async function listPublicFormCountriesAction() {
  return publicFormCountries()
}

/* ── Ask Easy · ADK desk (Slice L) ────────────────────────────── */

export type AskEasyState = {
  error: string | null
  message: string | null
  fieldErrors: Record<string, string[]>
  citations: import("@/lib/agentic").AttributeCitation[]
  toolName: string | null
  reply: string | null
}

const askEasyInitial: AskEasyState = {
  error: null,
  message: null,
  fieldErrors: {},
  citations: [],
  toolName: null,
  reply: null,
}

export async function submitAskEasyPrompt(
  _prev: AskEasyState,
  formData: FormData,
): Promise<AskEasyState> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ...askEasyInitial, error: "Switch to a landlord admin to use Ask Easy." }
  }
  const { askEasyGateReason, runAskEasy } = await import("@/lib/agentic")
  if (askEasyGateReason(user.tenantId) === "upgrade") {
    return {
      ...askEasyInitial,
      error: "Ask Easy requires Pro or higher. Upgrade from Settings.",
    }
  }
  const prompt = String(formData.get("prompt") ?? "")
  const propertyId = String(formData.get("propertyId") ?? "") || null
  const unitId = String(formData.get("unitId") ?? "") || null
  const onboard = String(formData.get("onboard") ?? "") === "1"
  const result = await runAskEasy({
    tenantId: user.tenantId,
    userId: user.id,
    prompt,
    propertyId,
    unitId,
    onboard,
  })
  refresh(["/landlord/ask-easy", "/landlord/ask", "/landlord", "/landlord/jobs", "/landlord/ledger", "/provider", "/inbox"])
  if (result.kind === "error") {
    return { ...askEasyInitial, error: result.error, toolName: result.toolName ?? null }
  }
  const mode = result.modelProvider === "live" ? "Live model" : "Stub"
  const reply = "reply" in result ? result.reply : ""
  return {
    ...askEasyInitial,
    message: `${reply} · ${mode}`,
    reply,
    citations: result.citations ?? [],
    toolName:
      result.toolName ??
      ("toolName" in result ? String((result as { toolName?: string }).toolName) : result.kind),
  }
}

export async function decideAskEasyProposal(
  _prev: AskEasyState,
  formData: FormData,
): Promise<AskEasyState> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ...askEasyInitial, error: "Switch to a landlord admin to decide proposals." }
  }
  const { askEasyGateReason, approveProposal, rejectProposal } = await import("@/lib/agentic")
  if (askEasyGateReason(user.tenantId) === "upgrade") {
    return { ...askEasyInitial, error: "Ask Easy requires Pro or higher." }
  }
  const proposalId = String(formData.get("proposalId") ?? "")
  const decision = String(formData.get("decision") ?? "")
  if (!proposalId) return { ...askEasyInitial, error: "Missing proposal." }
  if (decision === "reject") {
    const result = rejectProposal({
      tenantId: user.tenantId,
      proposalId,
      actorUserId: user.id,
    })
    refresh(["/landlord/ask-easy", "/landlord/ask", "/landlord/jobs", "/provider", "/inbox"])
    if (!result.ok) return { ...askEasyInitial, error: result.error }
    return {
      ...askEasyInitial,
      message: "Proposal rejected. No job, notify, ledger charge, or eSign send was created.",
      reply: "Proposal rejected. No job, notify, ledger charge, or eSign send was created.",
    }
  }
  if (decision === "approve") {
    const result = approveProposal({
      tenantId: user.tenantId,
      proposalId,
      actorUserId: user.id,
    })
    refresh([
      "/landlord/ask-easy",
      "/landlord/ask",
      "/landlord/jobs",
      "/landlord/ledger",
      "/landlord",
      "/provider",
      "/inbox",
    ])
    if (!result.ok) return { ...askEasyInitial, error: result.error }
    if (result.jobId) {
      const msg = `Approved and executed. Concierge job ${result.jobId} created.`
      return { ...askEasyInitial, message: msg, reply: msg }
    }
    if (result.envelopeId) {
      const msg = `Approved and executed. eSign envelope ${result.envelopeId} marked sent (demo).`
      return { ...askEasyInitial, message: msg, reply: msg }
    }
    if (result.partyId) {
      const msg = "Approved and executed. Lease party saved."
      return { ...askEasyInitial, message: msg, reply: msg }
    }
    if (result.ledgerEntryId || result.userId) {
      const msg = "Approved and executed. Occupant / ledger updated."
      return { ...askEasyInitial, message: msg, reply: msg }
    }
    if (result.unitId) {
      const msg = "Approved and executed. Listing status updated."
      return { ...askEasyInitial, message: msg, reply: msg }
    }
    return { ...askEasyInitial, message: "Approved and executed.", reply: "Approved and executed." }
  }
  return { ...askEasyInitial, error: "Choose Approve or Reject." }
}

export type AskEasyMemoryState = {
  error: string | null
  message: string | null
  deleted: number | null
}

const askEasyMemoryInitial: AskEasyMemoryState = {
  error: null,
  message: null,
  deleted: null,
}

/** L.1 — landlord self-service purge (DPDP erasure). */
export async function purgeAskEasyMemory(
  _prev: AskEasyMemoryState,
  formData: FormData,
): Promise<AskEasyMemoryState> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ...askEasyMemoryInitial, error: "Switch to a landlord admin to purge memory." }
  }
  const { askEasyGateReason, purgeAgentMemory, writeAuditEvent } = await import("@/lib/agentic")
  if (askEasyGateReason(user.tenantId) === "upgrade") {
    return { ...askEasyMemoryInitial, error: "Ask Easy requires Pro or higher." }
  }
  const mode = String(formData.get("mode") ?? "")
  const id = String(formData.get("id") ?? "")
  const propertyId = String(formData.get("propertyId") ?? "")
  let scope:
    | { mode: "id"; id: string }
    | { mode: "property"; propertyId: string }
    | { mode: "landlord" }
    | { mode: "all" }
  if (mode === "id" && id) scope = { mode: "id", id }
  else if (mode === "property" && propertyId) scope = { mode: "property", propertyId }
  else if (mode === "landlord") scope = { mode: "landlord" }
  else if (mode === "all") scope = { mode: "all" }
  else return { ...askEasyMemoryInitial, error: "Choose what to purge." }

  const result = purgeAgentMemory(user.tenantId, scope)
  if (!result.ok) return { ...askEasyMemoryInitial, error: result.error }
  writeAuditEvent({
    tenantId: user.tenantId,
    kind: "memory_purge",
    summary: `UI purge · ${scope.mode} · deleted ${result.deleted}`,
    detail: { scope, deleted: result.deleted },
    actorUserId: user.id,
  })
  refresh(["/landlord/ask", "/landlord/ask-easy"])
  return {
    ...askEasyMemoryInitial,
    deleted: result.deleted,
    message:
      result.deleted === 0
        ? "Nothing to purge."
        : `Purged ${result.deleted} memory row(s).`,
  }
}

/* ── Ask Easy · Slice L.0 in-memory queue (kept for main stubs) ─ */

export async function approveAgenticProposal(
  proposalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin to approve proposals." }
  }
  if (!packageHasAskEasy(user.tenantPackage ?? getTenantPackage(user.tenantId))) {
    return { ok: false, error: "Ask Easy is a Pro feature." }
  }
  const result = decideProposal({
    tenantId: user.tenantId,
    proposalId,
    actorId: user.id,
    decision: "approved",
  })
  if (!result.ok) return result
  refresh(["/landlord/ask", "/landlord/jobs", "/landlord", "/provider", "/inbox"])
  return { ok: true }
}

export async function rejectAgenticProposal(
  proposalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin to reject proposals." }
  }
  if (!packageHasAskEasy(user.tenantPackage ?? getTenantPackage(user.tenantId))) {
    return { ok: false, error: "Ask Easy is a Pro feature." }
  }
  const result = decideProposal({
    tenantId: user.tenantId,
    proposalId,
    actorId: user.id,
    decision: "rejected",
  })
  if (!result.ok) return result
  refresh(["/landlord/ask"])
  return { ok: true }
}

export async function runStubListingAutofill(
  prompt: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { ok: false, error: "Switch to a landlord admin to run autofill." }
  }
  if (!packageHasAskEasy(user.tenantPackage ?? getTenantPackage(user.tenantId))) {
    return { ok: false, error: "Ask Easy is a Pro feature." }
  }
  const trimmed = prompt.trim()
  if (trimmed.length < 8) {
    return { ok: false, error: "Describe the bay in a short prompt (at least 8 characters)." }
  }
  stubAutofillListing({
    tenantId: user.tenantId,
    prompt: trimmed,
    actorId: user.id,
  })
  refresh(["/landlord/ask"])
  return { ok: true }
}

export type ShopActionState = {
  error?: string | null
  message?: string | null
  orderId?: string | null
}

export async function addShopCartItem(
  _prev: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return { error: "Shop is for current occupants." }
  }
  const tenantId = String(formData.get("tenantId") ?? "")
  const skuId = String(formData.get("skuId") ?? "")
  const qty = Number(formData.get("qty") ?? 1)
  const slotStartRaw = String(formData.get("slotStart") ?? "").trim()
  const result = addToCart({
    userId: user.id,
    tenantId,
    skuId,
    qty,
    slotStart: slotStartRaw || null,
  })
  if (!result.ok) return { error: result.error }
  refresh(["/shop"])
  return { error: null, message: "Added to cart." }
}

export async function checkoutShopCart(
  _prev: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return { error: "Shop is for current occupants." }
  }
  const tenantId = String(formData.get("tenantId") ?? "")
  const note = String(formData.get("note") ?? "")
  const result = checkoutCart({ userId: user.id, tenantId, note })
  if (!result.ok) return { error: result.error }
  notifyMany(
    landlordIds(tenantId).map((id) => ({
      userId: id,
      title: "Shop order paid",
      body: `${user.name} placed a shop order (${result.paymentProvider}).`,
      href: "/landlord/shop",
    })),
  )
  notify({
    userId: user.id,
    title: result.labelledDemo ? "Shop order paid (demo)" : "Shop order paid",
    body: `Order ${result.orderId.slice(0, 8)} · ₹${(result.amountCents / 100).toFixed(0)} via ${result.paymentProvider}.`,
    href: "/shop",
  })
  refresh(["/shop", "/landlord/shop", "/inbox"])
  return {
    error: null,
    message: result.labelledDemo
      ? "Paid with demo adapter — no live charge."
      : "Paid via Razorpay stub — no live network charge in this build.",
    orderId: result.orderId,
  }
}

export async function saveRazorpaySettingsAction(
  _prev: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return { error: "Landlord admin only." }
  }
  const keyId = String(formData.get("keyId") ?? "").trim()
  const keySecret = String(formData.get("keySecret") ?? "")
  const demoMode = formData.get("demoMode") === "on"
  const enabled = formData.get("enabled") === "on"
  const razorpayMode = formData.get("razorpayMode") === "live" ? "live" : "test"
  const publicSettings = saveShopRazorpaySettings(user.tenantId, {
    keyId: keyId || null,
    keySecret: keySecret.trim() ? keySecret : null,
    demoMode,
    razorpayMode,
    enabled,
  })
  // Guard: never return secret fields from the action payload beyond public shape
  void publicSettings
  refresh(["/landlord/settings", "/landlord/shop", "/shop"])
  return { error: null, message: "Payment settings saved. Secret is write-only and was not echoed." }
}

export async function toggleShopSkuAction(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const skuId = String(formData.get("skuId") ?? "")
  const enabled = formData.get("enabled") === "1"
  setShopSkuEnabled(user.tenantId, skuId, enabled)
  refresh(["/landlord/shop", "/shop"])
}

export async function getShopSettingsPublicAction(tenantId: string) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || user.tenantId !== tenantId) {
    return null
  }
  return getShopSettingsPublic(tenantId)
}

export async function downloadMyData() {
  const user = await getSessionUser()
  if (!user) return { ok: false as const, error: "Sign in first." }
  const payload = exportUserData(user.id)
  if (!payload) return { ok: false as const, error: "No data." }
  recordConsentEvent({
    userId: user.id,
    email: user.email,
    purpose: "data_export",
    version: "dpdp-2023-v1",
  })
  return { ok: true as const, payload }
}

export async function requestAccountErasure() {
  const user = await getSessionUser()
  if (!user) return { ok: false as const, error: "Sign in first." }
  return redactUserPersonalData(user.id)
}

/* ─── Refer & Earn (§19A) ─────────────────────────────────────────────── */

export type ReferSubmitState = {
  error: string | null
  fieldErrors: Record<string, string>
  ok?: boolean
  indicationId?: string
}

const referSubmitSchema = z.object({
  propertyAddress: z.string().trim().min(5, "Enter a street / plot address"),
  propertyCity: z.string().trim().min(2, "Enter the city"),
  propertyPin: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN"),
  propertyType: z.enum(["warehouse", "office", "industrial_park", "retail", "other"]),
  approxSqft: z.string().trim().optional(),
  askingRentInr: z.string().trim().optional(),
  landlordName: z.string().trim().min(2, "Enter the landlord name"),
  landlordPhone: z.string().trim().min(10, "Enter a +91 mobile"),
  landlordEmail: z.string().trim().optional(),
  consent: z.string().optional(),
  referrerName: z.string().trim().min(2, "Enter your name"),
  referrerPhone: z.string().trim().min(10, "Enter your mobile"),
  referrerEmail: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter your email"),
})

export async function submitReferralIndication(
  _prev: ReferSubmitState,
  formData: FormData,
): Promise<ReferSubmitState> {
  const parsed = referSubmitSchema.safeParse({
    propertyAddress: formData.get("propertyAddress"),
    propertyCity: formData.get("propertyCity"),
    propertyPin: formData.get("propertyPin"),
    propertyType: formData.get("propertyType"),
    approxSqft: formData.get("approxSqft") || undefined,
    askingRentInr: formData.get("askingRentInr") || undefined,
    landlordName: formData.get("landlordName"),
    landlordPhone: formData.get("landlordPhone"),
    landlordEmail: formData.get("landlordEmail") || undefined,
    consent: formData.get("consent") || undefined,
    referrerName: formData.get("referrerName"),
    referrerPhone: formData.get("referrerPhone"),
    referrerEmail: formData.get("referrerEmail"),
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }
  if (parsed.data.consent !== "on" && parsed.data.consent !== "true" && parsed.data.consent !== "1") {
    return {
      error: "Owner consent is required before we contact the landlord.",
      fieldErrors: { consent: "Confirm the owner consented to be contacted." },
    }
  }

  const session = await getSessionUser()
  let referrer =
    session?.role === "referrer" ? getReferrerByUserId(session.id) : null
  if (!referrer && session) {
    // Soft account: bind submitter identity when already signed in as referrer-capable
    if (session.role === "referrer") {
      referrer = ensureReferrerForUser(session)
    }
  }
  if (!referrer) {
    referrer = createReferrerFromSubmit({
      name: parsed.data.referrerName,
      phone: parsed.data.referrerPhone,
      email: parsed.data.referrerEmail,
      userId: session?.id ?? null,
    })
  }

  const sqftRaw = parsed.data.approxSqft?.replace(/,/g, "")
  const rentRaw = parsed.data.askingRentInr?.replace(/,/g, "")
  const approxSqft = sqftRaw ? Number(sqftRaw) : null
  const askingRentPaise =
    rentRaw && Number.isFinite(Number(rentRaw)) ? Math.round(Number(rentRaw) * 100) : null

  const created = createIndication({
    referrerId: referrer.id,
    path: "submit",
    propertyAddress: parsed.data.propertyAddress,
    propertyCity: parsed.data.propertyCity,
    propertyPin: parsed.data.propertyPin,
    propertyType: parsed.data.propertyType as PropertyType,
    approxSqft: approxSqft && approxSqft > 0 ? approxSqft : null,
    askingRentPaise,
    landlordName: parsed.data.landlordName,
    landlordPhone: parsed.data.landlordPhone,
    landlordEmail: parsed.data.landlordEmail || null,
    consentAt: new Date().toISOString(),
  })
  if (!created.ok) {
    return { error: created.error, fieldErrors: {} }
  }

  if (session) {
    notify({
      userId: session.id,
      title: "Indication received",
      body: `${parsed.data.propertyCity} · ${parsed.data.propertyType} is in New status.`,
      href: "/refer/dashboard",
    })
  }
  notifyMany(
    ["u_avery", "u_sam"].map((userId) => ({
      userId,
      title: "New Refer & Earn indication",
      body: `${referrer!.name} submitted ${parsed.data.propertyCity} (${parsed.data.propertyType}).`,
      href: "/cms/referrals",
    })),
  )

  refresh(["/refer/dashboard", "/refer/rewards", "/cms/referrals", "/inbox"])
  return { error: null, fieldErrors: {}, ok: true, indicationId: created.id }
}

export async function captureReferralCode(code: string) {
  const result = recordReferralAttribution(code)
  if (!result.ok) return result
  const jar = await cookies()
  jar.set(REF_COOKIE, result.code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: REF_COOKIE_MAX_AGE,
  })
  return result
}

export type LinkClaimState = {
  error: string | null
  fieldErrors: Record<string, string>
  ok?: boolean
}

const linkClaimSchema = z.object({
  propertyAddress: z.string().trim().min(5, "Enter the property address"),
  propertyCity: z.string().trim().min(2, "Enter the city"),
  propertyPin: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN"),
  propertyType: z.enum(["warehouse", "office", "industrial_park", "retail", "other"]),
  approxSqft: z.string().trim().optional(),
  askingRentInr: z.string().trim().optional(),
  landlordName: z.string().trim().min(2, "Enter your name"),
  landlordPhone: z.string().trim().min(10, "Enter a +91 mobile"),
  landlordEmail: z.string().trim().optional(),
})

export async function claimReferralAsLandlord(
  _prev: LinkClaimState,
  formData: FormData,
): Promise<LinkClaimState> {
  const jar = await cookies()
  const code = String(formData.get("refCode") || jar.get(REF_COOKIE)?.value || "").trim()
  if (!code || !getReferrerByCode(code)) {
    return { error: "Missing or unknown referral code. Open your personal /r/ link first.", fieldErrors: {} }
  }
  const parsed = linkClaimSchema.safeParse({
    propertyAddress: formData.get("propertyAddress"),
    propertyCity: formData.get("propertyCity"),
    propertyPin: formData.get("propertyPin"),
    propertyType: formData.get("propertyType"),
    approxSqft: formData.get("approxSqft") || undefined,
    askingRentInr: formData.get("askingRentInr") || undefined,
    landlordName: formData.get("landlordName"),
    landlordPhone: formData.get("landlordPhone"),
    landlordEmail: formData.get("landlordEmail") || undefined,
  })
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: issues(parsed.error) }
  }

  const session = await getSessionUser()
  const sqftRaw = parsed.data.approxSqft?.replace(/,/g, "")
  const rentRaw = parsed.data.askingRentInr?.replace(/,/g, "")
  const result = attachAttributionToLandlord({
    code,
    landlordUserId: session?.id ?? `guest_${normalizePhone(parsed.data.landlordPhone)}`,
    tenantId: session?.tenantId ?? null,
    propertyAddress: parsed.data.propertyAddress,
    propertyCity: parsed.data.propertyCity,
    propertyPin: parsed.data.propertyPin,
    propertyType: parsed.data.propertyType as PropertyType,
    approxSqft: sqftRaw && Number(sqftRaw) > 0 ? Number(sqftRaw) : null,
    askingRentPaise:
      rentRaw && Number.isFinite(Number(rentRaw)) ? Math.round(Number(rentRaw) * 100) : null,
    landlordName: parsed.data.landlordName,
    landlordPhone: parsed.data.landlordPhone,
    landlordEmail: parsed.data.landlordEmail || null,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }

  const referrer = getReferrerByCode(code)
  if (referrer?.userId) {
    notify({
      userId: referrer.userId,
      title: "Landlord used your link",
      body: `${parsed.data.landlordName} added ${parsed.data.propertyCity} via ${code}.`,
      href: "/refer/dashboard",
    })
  }
  refresh(["/refer/dashboard", "/cms/referrals", "/inbox", "/signup"])
  return { error: null, fieldErrors: {}, ok: true }
}

export async function cmsAdvanceIndication(formData: FormData) {
  const user = await getSessionUser()
  if (!user || !staffCapabilities(user.role)?.manageReferrals) {
    return
  }
  const id = String(formData.get("indicationId") ?? "")
  const to = String(formData.get("toStatus") ?? "") as IndicationStatus
  const leasedRentInr = String(formData.get("leasedRentInr") ?? "").replace(/,/g, "")
  const leasedRentPaise =
    leasedRentInr && Number.isFinite(Number(leasedRentInr))
      ? Math.round(Number(leasedRentInr) * 100)
      : undefined
  const result = advanceIndicationStatus(id, to, {
    leasedRentPaise,
    reason: to === "deactivated" ? "staff" : to === "discarded" ? "staff" : undefined,
  })
  if (result.ok) {
    const { getIndication, getReferrerById } = await import("@/lib/db")
    const ind = getIndication(id)
    const ref = ind ? getReferrerById(ind.referrerId) : null
    if (ref?.userId) {
      notify({
        userId: ref.userId,
        title: `Indication → ${to}`,
        body: `${ind?.propertyCity ?? "Property"} is now ${to}.`,
        href: "/refer/dashboard",
      })
    }
  }
  refresh(["/cms/referrals", "/refer/dashboard", "/refer/rewards", "/inbox"])
}

export async function ensureMyReferralLink() {
  const user = await getSessionUser()
  if (!user) return { ok: false as const, error: "Pick Asha Reddy (or any identity) in the demo header." }
  if (user.role === "referrer") {
    const ref = ensureReferrerForUser(user)
    return { ok: true as const, code: ref.code }
  }
  // Soft: allow staff / landlords to mint a demo referrer code tied to their user
  const ref = ensureReferrerForUser(user)
  return { ok: true as const, code: ref.code }
}

/* ─── Slice A SaaS auth actions ───────────────────────────────────── */

type LandlordActor = NonNullable<Awaited<ReturnType<typeof getSessionUser>>> & {
  tenantId: string
}

function requireLandlordCap(
  user: Awaited<ReturnType<typeof getSessionUser>>,
  cap: keyof NonNullable<ReturnType<typeof seatCapabilities>>,
): LandlordActor | null {
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return null
  const caps = seatCapabilities(user.seatRole ?? "owner")
  if (!caps?.[cap]) return null
  return user as LandlordActor
}

const emptyAuth: AuthFormState = { error: null, message: null, fieldErrors: {} }

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const parsed = z
    .object({
      name: z.string().min(2, "Enter your name"),
      email: z.string().email("Enter a work email"),
      password: z.string().min(8, "Use at least 8 characters"),
    })
    .safeParse({ name, email, password })
  if (!parsed.success) {
    return { ...emptyAuth, error: "Check the form.", fieldErrors: issues(parsed.error) }
  }
  const auth = getAuthProvider()
  const result = await auth.signUp(parsed.data)
  if (!result.ok) return { ...emptyAuth, error: result.error }
  await setSessionUserId(result.userId)
  {
    const jar = await cookies()
    jar.delete(ADMIN_SESSION_COOKIE)
  }
  revalidatePath("/", "layout")
  redirect("/create-account")
}

export async function logInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const auth = getAuthProvider()
  const result = await auth.logIn({ email, password })
  if (!result.ok) return { ...emptyAuth, error: result.error }
  await setSessionUserId(result.userId)
  if (canImpersonate(getUser(result.userId)?.roleLevel ?? 5)) {
    await setAdminSessionCookie(result.userId)
  } else {
    const jar = await cookies()
    jar.delete(ADMIN_SESSION_COOKIE)
  }
  revalidatePath("/", "layout")
  const user = getUser(result.userId)
  if (!user) redirect("/")
  if (!user.onboardingComplete || user.role === "pending") {
    redirect("/onboarding/role")
  }
  if (
    user.roleLevel === 2 &&
    !user.tenantIsDemo &&
    !subscriptionAllowsDesk(user.tenantStatus)
  ) {
    redirect(`${SUBSCRIBE_PATH}?from=onboard`)
  }
  if (user.role === "landlord_admin" && user.tenantId) redirect("/landlord")
  if (canOpenConsole(user.roleLevel)) redirect("/console")
  if (user.role === "applicant") redirect("/account")
  redirect(deskPathForLevel(user.roleLevel))
}

export async function logOutAction() {
  await clearSessionCookies()
  revalidatePath("/", "layout")
  redirect("/")
}

export async function createAccountAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getSessionUser()
  if (!user) {
    return { ...emptyAuth, error: "Sign up or log in before creating an organisation." }
  }
  const parsed = z
    .object({
      legalName: z.string().trim().min(2, "Enter the legal name"),
      city: z.string().trim().min(2, "Enter a city"),
      actingAs: z.string().trim().min(2, "Say who is acting"),
      entityType: z.string().trim().min(2, "Enter an entity type"),
      contactName: z.string().trim().min(2, "Enter a contact name"),
      contactEmail: z.string().trim().email("Enter a contact email"),
      country: z.string().trim().min(2),
      packageId: z.string().optional(),
    })
    .safeParse({
      legalName: formData.get("legalName"),
      city: formData.get("city"),
      actingAs: formData.get("actingAs"),
      entityType: formData.get("entityType"),
      contactName: formData.get("contactName") || user.name,
      contactEmail: formData.get("contactEmail") || user.email,
      country: formData.get("country"),
      packageId: formData.get("packageId") || DEFAULT_PACKAGE,
    })
  if (!parsed.success) {
    return { ...emptyAuth, error: "Check the organisation form.", fieldErrors: issues(parsed.error) }
  }
  const country = parsed.data.country
  if (country.toLowerCase() !== "india" && country.toUpperCase() !== "IN") {
    return {
      ...emptyAuth,
      error: "Public Create account is India-only until another market clears the checklist.",
      fieldErrors: { country: "India only" },
    }
  }
  const auth = getAuthProvider()
  const result = await auth.createOrg(user.id, {
    ...parsed.data,
    packageId: parsePackage(parsed.data.packageId),
  })
  if (!result.ok) return { ...emptyAuth, error: result.error }
  revalidatePath("/", "layout")
  redirect("/landlord")
}

export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const auth = getAuthProvider()
  const result = await auth.requestPasswordReset(email)
  if (!result.ok) return { ...emptyAuth, error: result.error }
  return {
    ...emptyAuth,
    message:
      "If that email has an account, a demo reset notice was queued. Check the inbox (email_demo) — live SMTP is not wired yet.",
  }
}

export async function inviteSeatAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = requireLandlordCap(await getSessionUser(), "inviteSeats")
  if (!user?.tenantId) {
    return { ...emptyAuth, error: "Only an owner can invite teammates." }
  }
  const email = String(formData.get("email") ?? "").trim()
  const seatRoleRaw = String(formData.get("seatRole") ?? "")
  if (!isSeatRole(seatRoleRaw) || seatRoleRaw === "owner") {
    return { ...emptyAuth, error: "Choose leasing manager, accountant, or viewer." }
  }
  const auth = getAuthProvider()
  const result = await auth.inviteSeat({
    tenantId: user.tenantId,
    email,
    seatRole: seatRoleRaw,
    invitedByUserId: user.id,
  })
  if (!result.ok) return { ...emptyAuth, error: result.error }
  refresh(["/landlord/settings", "/inbox"])
  return {
    ...emptyAuth,
    message: `Invite sent to ${email}. Accept link: /invite/${result.token}`,
  }
}

export async function acceptInviteAction(token: string) {
  const user = await getSessionUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)
  }
  const auth = getAuthProvider()
  const result = await auth.acceptInvite(token, user.id)
  if (!result.ok) {
    redirect(`/invite/${token}?error=${encodeURIComponent(result.error)}`)
  }
  revalidatePath("/", "layout")
  redirect("/landlord")
}

export async function previewInvite(token: string) {
  return getInviteByToken(token)
}

/* ─── Slice C portal ───────────────────────────────────────────────────── */

export async function acceptPortalInvite(token: string) {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return { error: "Switch to the invited applicant identity first." }
  }
  const result = acceptOccupantInvite(token, user.id)
  if (!result.ok) return { error: result.error }
  notify({
    userId: user.id,
    title: result.already ? "Portal already open" : "Occupant portal opened",
    body: result.already
      ? "Your lease portal was already accepted. Dues, tickets, and documents are ready."
      : "Welcome to your occupant portal. Review dues, file tickets, and complete demo e-sign.",
    href: "/portal",
  })
  refresh(["/portal", "/portal/ledger", "/portal/tickets", "/portal/documents", "/account", "/inbox"])
  redirect("/portal?notice=Portal+ready.+Your+active+lease+is+on+this+desk.")
}

export async function submitTicket(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant" || !hasActiveLease(user.id)) {
    return { error: "An active lease is required to file a ticket.", fieldErrors: {} }
  }
  const parsed = z
    .object({
      leaseId: z.string().min(1),
      category: z.enum(["maintenance", "billing", "noise", "access", "other"]),
      subject: z.string().trim().min(3, "Give the ticket a short subject"),
      body: z.string().trim().min(5, "Describe the issue"),
      photoName: z.string().trim().optional(),
    })
    .safeParse({
      leaseId: formData.get("leaseId"),
      category: formData.get("category"),
      subject: formData.get("subject"),
      body: formData.get("body"),
      photoName: formData.get("photoName") || undefined,
    })
  if (!parsed.success) {
    return { error: "Check the ticket fields.", fieldErrors: issues(parsed.error) }
  }
  const result = createTicket({
    occupantId: user.id,
    leaseId: parsed.data.leaseId,
    category: parsed.data.category as TicketCategory,
    subject: parsed.data.subject,
    body: parsed.data.body,
    photoName: parsed.data.photoName || null,
  })
  if (!result.ok) return { error: result.error, fieldErrors: {} }
  notify({
    userId: user.id,
    title: "Ticket filed",
    body: `${parsed.data.subject} is open with your landlord.`,
    href: "/portal/tickets",
  })
  notifyMany(
    landlordIds(result.tenantId).map((id) => ({
      userId: id,
      title: "New ticket",
      body: `${user.name} filed: ${parsed.data.subject}.`,
      href: "/landlord/tickets",
    })),
  )
  refresh(["/portal", "/portal/tickets", "/landlord/tickets", "/inbox"])
  return { error: null, fieldErrors: {} }
}

export async function submitTicketTransition(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return
  const next = String(formData.get("next") ?? "") as TicketStatus
  const ticketId = String(formData.get("ticketId") ?? "")
  const result = transitionTicket({
    ticketId,
    actorId: user.id,
    actorRole: user.role,
    tenantId: user.tenantId,
    next,
  })
  if (!result.ok) return
  const recipient =
    user.role === "landlord_admin" ? result.ticket.occupantId : landlordIds(result.ticket.tenantId)[0]
  if (recipient) {
    notify({
      userId: recipient,
      title: `Ticket ${next.replace("_", " ")}`,
      body: `${result.ticket.subject} is now ${next.replace("_", " ")}.`,
      href: user.role === "landlord_admin" ? "/portal/tickets" : "/landlord/tickets",
    })
  }
  refresh(["/portal/tickets", "/landlord/tickets", "/inbox"])
}

export async function submitInterestAccrual() {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const touched = accrueInterest(user.tenantId)
  if (touched > 0) {
    notify({
      userId: user.id,
      title: "Interest accrued",
      body: `Updated interest on ${touched} overdue rent line${touched === 1 ? "" : "s"} (simple daily after grace).`,
      href: "/landlord/ledger",
    })
  }
  refresh(["/landlord/ledger", "/portal", "/portal/ledger", "/account/payments", "/inbox"])
}

export async function submitRentReminders() {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const { created, notices } = enqueueRentReminders(user.tenantId)
  if (notices.length > 0) notifyMany(notices)
  if (created > 0) {
    notify({
      userId: user.id,
      title: "Reminders queued",
      body: `${created} rent reminder${created === 1 ? "" : "s"} enqueued for today (T−3 / T+1). Demo channels only.`,
      href: "/landlord/reminders",
    })
  }
  refresh(["/landlord/reminders", "/portal", "/inbox"])
}

export async function submitReminderAck(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") return
  const lineId = String(formData.get("lineId") ?? "")
  const result = acknowledgeReminder(user.id, lineId)
  if (!result.ok) return
  refresh(["/portal", "/inbox"])
}

export async function submitSendEnvelope(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) return
  const leaseId = String(formData.get("leaseId") ?? "")
  const documentName = String(formData.get("documentName") ?? "").trim()
  if (!leaseId || documentName.length < 3) return
  const result = createAndSendEnvelope({
    tenantId: user.tenantId,
    leaseId,
    documentName,
  })
  if (!result.ok) return
  notify({
    userId: result.occupantId,
    title: "Document ready to sign",
    body: `${documentName} awaits your demo signature.`,
    href: "/portal/documents",
  })
  notify({
    userId: user.id,
    title: "E-sign packet sent",
    body: `${documentName} sent via demoESign (no DocuSign network call).`,
    href: "/landlord/esign",
  })
  refresh(["/landlord/esign", "/portal/documents", "/inbox"])
}

export async function submitDemoSign(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") return
  const envelopeId = String(formData.get("envelopeId") ?? "")
  const result = completeDemoEnvelope(envelopeId, user.id)
  if (!result.ok) return
  notify({
    userId: user.id,
    title: "Document signed (demo)",
    body: "Local stamp written. No DocuSign network call was made.",
    href: "/portal/documents",
  })
  notifyMany(
    landlordIds(result.tenantId).map((id) => ({
      userId: id,
      title: "E-sign completed",
      body: `${user.name} completed a demo signature.`,
      href: "/landlord/esign",
    })),
  )
  refresh(["/portal/documents", "/landlord/esign", "/inbox"])
}

/** Restored Origin-mirror action shims (were missing on main — unblocks Next build). */
export async function createListingUnitForm(formData: FormData) {
  const user = await getSessionUser()
  if (!user?.tenantId || (user.role !== "landlord_admin" && user.role !== "property_manager")) return
  const { createUnitForProperty } = await import("@/lib/role-cms-store")
  const { assertFreePlanUnitSlot } = await import("@/lib/db")
  const gate = assertFreePlanUnitSlot(user.tenantId)
  if (!gate.ok) return
  const result = createUnitForProperty({
    tenantId: user.tenantId,
    propertyId: String(formData.get("propertyId") ?? ""),
    code: String(formData.get("code") ?? "").trim(),
    sqft: Number(formData.get("sqft") ?? 0),
    clearHeight: String(formData.get("clearHeight") ?? ""),
    docks: Number(formData.get("docks") ?? 0),
    driveIns: Number(formData.get("driveIns") ?? 0),
    power: String(formData.get("power") ?? ""),
    ratePsf: Number(formData.get("ratePsf") ?? 0),
    description: String(formData.get("description") ?? ""),
  })
  if (!result.ok) return
  refresh(["/landlord/listings", "/listings", "/landlord/properties"])
}

export async function saveListingPricingForm(formData: FormData) {
  const user = await getSessionUser()
  if (!user?.tenantId || (user.role !== "landlord_admin" && user.role !== "property_manager")) return
  const { updateUnitListing } = await import("@/lib/role-cms-store")
  const unitId = String(formData.get("unitId") ?? "")
  const listed = String(formData.get("listed") ?? "1") === "1"
  const matterportRaw = String(formData.get("matterportUrl") ?? "").trim()
  updateUnitListing(user.tenantId, unitId, {
    ratePsf: Number(formData.get("ratePsf") ?? 0),
    description: String(formData.get("description") ?? ""),
    listed,
    matterportUrl: matterportRaw || null,
  })
  refresh(["/landlord/listings", "/listings", "/agent/listings"])
}

export async function saveProfileNotifPrefs(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return
  const { saveNotifPrefs } = await import("@/lib/role-cms-store")
  saveNotifPrefs(user.id, {
    applications: formData.has("applications"),
    visits: formData.has("visits"),
    tickets: formData.has("tickets"),
    ledger: formData.has("ledger"),
    shop: formData.has("shop"),
    marketing: formData.has("marketing"),
  })
  refresh(["/profile"])
}

export async function reviewApplicationAsDesk(formData: FormData) {
  return reviewApplication(formData)
}

export async function generateRentalAgreement(formData: FormData) {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    return { error: "Landlord admin required." }
  }
  const { createAgreement } = await import("@/lib/role-cms-store")
  const rentMajor = Number(formData.get("rentInr") ?? 0)
  const depositMajor = Number(formData.get("depositInr") ?? 0)
  const agreement = createAgreement({
    tenantId: user.tenantId,
    unitId: String(formData.get("unitId") ?? ""),
    landlordName: String(formData.get("landlordName") ?? user.name),
    tenantPartyName: String(formData.get("tenantPartyName") ?? "Occupant").trim() || "Occupant",
    propertyLabel: String(formData.get("propertyLabel") ?? ""),
    unitCode: String(formData.get("unitCode") ?? ""),
    rentInrCents: Math.round(rentMajor * 100),
    depositInrCents: Math.round(depositMajor * 100),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    lockInMonths: Number(formData.get("lockInMonths") ?? 11),
    noticeDays: Number(formData.get("noticeDays") ?? 30),
    extras: String(formData.get("extras") ?? ""),
  })
  refresh(["/agreements", `/agreements/${agreement.id}`])
  return { error: null, agreementId: agreement.id }
}

export async function demoEsignAgreementForm(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return
  const { demoSignAgreement } = await import("@/lib/role-cms-store")
  const id = String(formData.get("agreementId") ?? formData.get("id") ?? "")
  const mode =
    formData.get("mode") === "aadhaar_esign_demo" ? "aadhaar_esign_demo" : "signed_demo"
  demoSignAgreement(id, mode)
  refresh([`/agreements/${id}`, "/agreements"])
}
