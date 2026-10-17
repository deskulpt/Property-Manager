import Link from "next/link"
import { Building2, Handshake, Landmark, Scale, Sparkles, Wrench } from "lucide-react"
import { BRAND_CONTACT, mailtoHref } from "@/lib/brand-contact"

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/listings", label: "Listings" },
      { href: "/#map", label: "Map" },
      { href: "/properties", label: "Portfolio" },
      { href: "/shop", label: "Shop" },
      { href: "/account", label: "Applicant desk" },
      { href: "/landlord/ask", label: "Ask Easy" },
    ],
  },
  {
    title: "Landlords",
    links: [
      { href: "/signup", label: "Create landlord account" },
      { href: "/pricing", label: "Pricing" },
      { href: "/landlord", label: "Landlord desk" },
      { href: "/landlord/visits", label: "Visit booking" },
    ],
  },
  {
    title: "Partners",
    links: [
      { href: "/partners", label: "Partner hub" },
      { href: "/partners/affiliate", label: "Affiliates" },
      { href: "/partners/services", label: "Service providers" },
      { href: "/partners/refer", label: "Refer a partner" },
      { href: "/refer", label: "Refer & Earn (listings)" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/partners/services", label: "On-demand trades" },
      { href: "/partners/services/apply", label: "Apply as provider" },
      { href: "/cms/partners", label: "Partner directory (staff)" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Easy Rental" },
      { href: "/about#markets", label: "Markets (India)" },
      { href: "/about#trust", label: "Trust & safety" },
      { href: "/careers", label: "Careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: mailtoHref(BRAND_CONTACT.email), label: "Contact" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-brand-deep px-4 py-14 text-paper/65 md:px-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Easy Rental"
              width={200}
              height={45}
              className="h-10 w-auto brightness-110"
            />
            <p className="mt-4 text-sm leading-relaxed text-paper/75">
              Industrial leasing desk for India — warehouses, yards, and parks. A product of
              DeSkulpt Inc.
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/45">
              INR · +91 · India
            </p>
          </div>
          <nav
            className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-6"
            aria-label="Site"
          >
            {COLUMNS.map((col) => {
              const Icon =
                col.title === "Product"
                  ? Sparkles
                  : col.title === "Landlords"
                    ? Landmark
                    : col.title === "Partners"
                      ? Handshake
                      : col.title === "Services"
                        ? Wrench
                        : col.title === "Company"
                          ? Building2
                          : Scale
              return (
              <div key={col.title}>
                <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ed0e0]">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {col.title}
                </p>
                <ul className="mt-3 grid gap-2">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-paper/70 transition-colors hover:text-paper"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )})}
          </nav>
        </div>
        <p className="mt-12 border-t border-white/10 pt-6 font-mono text-[11px] text-paper/40">
          © {new Date().getFullYear()} DeSkulpt Inc. · easyrental.space · No CRECI/RERA seal claims —
          India credentials collected as form fields only.
        </p>
      </div>
    </footer>
  )
}
