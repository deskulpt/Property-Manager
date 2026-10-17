import { PartnerLandingShell } from "@/components/partners/landing-shell"

export const metadata = { title: "Affiliate partners" }

export default function AffiliateLandingPage() {
  return (
    <PartnerLandingShell
      kicker="Affiliates · §19C"
      title="Enrol landlords onto the Easy Rental desk."
      lede="For Realtors, Architects, and Contractors who introduce C&I landlords to SaaS. Application and vetting now; 20% subscription commission when billing ships (§19B)."
      heroImage="/marketing/lifestyle/yard-ops.jpg"
      illustration="/marketing/illustrations/partner-network.svg"
      ctaHref="/partners/affiliate/apply"
      ctaLabel="Apply as affiliate"
      secondaryHref="/partners/refer"
      secondaryLabel="Refer someone"
      steps={[
        {
          title: "Apply",
          body: "Tell us your type, city, service PINs, PAN, and optional RERA / GSTIN.",
        },
        {
          title: "Docs & ID review",
          body: "Staff review uploads and run demo Aadhaar / PAN checks — clearly labelled as demo.",
        },
        {
          title: "Activate",
          body: "When approved and areas are enabled, you are ready for SaaS enrolment codes (§19B later).",
        },
      ]}
      requirements={[
        "India-based · English UI · age 18+",
        "PAN required (payout readiness)",
        "RERA / broker licence optional text where applicable — no invented national seal",
        "GSTIN optional format check",
        "No exclusivity — you may work other channels (proposed)",
      ]}
      faq={[
        {
          q: "Is there a signup fee?",
          a: "No signup fee for the demo affiliate track.",
        },
        {
          q: "How do commissions work?",
          a: "Full 20% of monthly SaaS subscription is scheduled under §19B after live billing. This MVP collects applications and areas only.",
        },
        {
          q: "Looking for property listing leads?",
          a: "Use Refer & Earn at /refer — that program sources C&I listings, not SaaS enrolments.",
        },
        {
          q: "Is verification live Aadhaar?",
          a: "No. Demo toggles only — not UIDAI or NSDL.",
        },
      ]}
    />
  )
}
