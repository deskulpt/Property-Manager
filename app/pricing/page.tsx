import { PlatformPricing } from "@/components/billing/platform-pricing"

export const metadata = {
  title: "Pricing",
  description:
    "Easy Rental landlord plans: Free (1 unit), then per-unit Homes / Retail & Office / Industrial in INR + 18% GST. Launch sale until 31 Mar 2027 or 500 paying accounts.",
}

export default function PricingRoute() {
  // Sale window is wall-clock by product spec (1 Dec 2026 – 31 Mar 2027 IST).
  // eslint-disable-next-line react-hooks/purity -- intentional request-time sale check
  const nowMs = Date.now()
  return <PlatformPricing nowMs={nowMs} />
}
