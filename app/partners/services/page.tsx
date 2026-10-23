import { PartnerLandingShell } from "@/components/partners/landing-shell"

export const metadata = { title: "Service providers" }

export default function ServicesLandingPage() {
  return (
    <PartnerLandingShell
      kicker="Service providers · §19C"
      title="On-demand trades for industrial parks."
      lede="Plumbers, electricians, cleaning crews, and couriers — activated when your catchment has demand, then assigned only after a landlord approves."
      heroImage="/marketing/lifestyle/industrial-interior.jpg"
      illustration="/marketing/illustrations/service-ops.svg"
      ctaHref="/partners/services/apply"
      ctaLabel="Apply as service provider"
      secondaryHref="/partners/refer"
      secondaryLabel="Refer a trade"
      steps={[
        {
          title: "Apply with trade + areas",
          body: "Home-base PIN, city, radius (default 25 km), and extra PIN prefixes you cover.",
        },
        {
          title: "Vetting",
          body: "Docs, demo ID check, and catchment review. Ops may hold you in area approval until demand_ok.",
        },
        {
          title: "Activate when catchment is enabled",
          body: "Active providers appear in the job picker only for properties inside your PIN/city/radius.",
        },
      ]}
      requirements={[
        "Trade: plumber · electrician · cleaning · courier",
        "+91 phone, PAN, demo Aadhaar consent",
        "GSTIN optional; trade cert upload stub optional",
        "Onboarding checklist ack (quizzes later)",
        "Non-exclusive — you may work other channels",
      ]}
      faq={[
        {
          q: "Why am I not seeing jobs yet?",
          a: "Activation is catchment- and demand-gated. You stay hidden until status is active and demand_ok is set for your areas.",
        },
        {
          q: "Can landlords auto-assign me?",
          a: "No. Landlord approve → assign is required. Ask Easy may propose; it never auto-notifies.",
        },
        {
          q: "Want to refer a listing instead?",
          a: "Property sourcing is Refer & Earn at /refer — separate from the trade network.",
        },
      ]}
    />
  )
}
