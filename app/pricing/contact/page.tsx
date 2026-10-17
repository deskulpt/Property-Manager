import Link from "next/link"
import {
  BRAND_CONTACT,
  mailtoHref,
  telHref,
  whatsappHref,
} from "@/lib/brand-contact"

export const metadata = { title: "Enterprise contact" }

const WA = whatsappHref(
  BRAND_CONTACT.whatsappE164,
  "Hello Easy Rental — Enterprise / volume pricing for our C&I portfolio.",
)

export default function PricingContactPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-14 md:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Easy Rental" className="h-10 w-auto" width={200} height={44} />
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-terra">
        Enterprise
      </p>
      <h1 className="mt-2 font-serif text-3xl font-medium">Talk to sales</h1>
      <p className="mt-3 text-ink-soft">
        Volume seats, SSO, and white-label paths are sales-led. Reach us on WhatsApp, phone, or
        email — demo numbers below.
      </p>
      <ul className="mt-8 space-y-3 border border-ink/15 bg-paper-2 p-5 text-sm">
        <li>
          <a
            href={WA}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-terra hover:underline"
          >
            WhatsApp
          </a>
        </li>
        <li>
          <a href={telHref(BRAND_CONTACT.salesPhoneE164)} className="font-semibold text-terra hover:underline">
            {BRAND_CONTACT.salesPhoneDisplay}
          </a>
          <span className="ml-2 text-ink-soft">({BRAND_CONTACT.label})</span>
        </li>
        <li>
          <a href={mailtoHref(BRAND_CONTACT.email)} className="font-semibold text-terra hover:underline">
            {BRAND_CONTACT.email}
          </a>
        </li>
      </ul>
      <p className="mt-8">
        <Link
          href="/pricing"
          className="text-sm font-medium text-terra underline-offset-4 hover:underline"
        >
          ← Back to pricing
        </Link>
      </p>
    </div>
  )
}
