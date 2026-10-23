import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google"
import Link from "next/link"
import "./globals.css"
import { AdminSessionBar } from "@/components/admin/admin-session-bar"
import { BrandLogo } from "@/components/brand-logo"
import { SiteHeader } from "@/components/site-header"
import { PwaRegister } from "@/components/pwa-register"
import { Toaster } from "@/components/ui/sonner"
import { listSessionUsers, unreadCount } from "@/lib/db"
import { t } from "@/lib/i18n"
import { getAdminSessionUser, getSessionUser } from "@/lib/session"

/** Helvetica-adjacent UI sans — professional, not display/stretched. */
const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans-face",
  weight: ["400", "500", "600", "700"],
})

/** Restrained editorial serif for titles — modest sizes only. */
const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif-face",
  weight: ["400", "500", "600", "700"],
})

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "Easy Rental",
    template: "%s · Easy Rental",
  },
  description:
    "Multi-tenant industrial leasing desk. Browse bays, apply, and run a landlord portfolio with verification and payments.",
  applicationName: "Easy Rental",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  metadataBase: new URL("https://easyrental.space"),
}

export const viewport: Viewport = {
  themeColor: "#13253A",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [users, session, adminSession] = await Promise.all([
    listSessionUsers(),
    getSessionUser(),
    getAdminSessionUser(),
  ])
  const unread = session ? unreadCount(session.id) : 0
  const switchUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.role,
    tenantName: user.tenantName,
    trade: user.trade,
    serviceArea: user.serviceArea,
  }))
  const showAdminBar = Boolean(adminSession)

  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body
        className={`flex min-h-full flex-col bg-paper font-sans text-ink ${showAdminBar ? "pb-20" : ""}`}
      >
        <SiteHeader
          users={switchUsers}
          currentId={session?.id ?? ""}
          unread={unread}
          role={session?.role ?? null}
          signedIn={Boolean(session)}
          demoSwitcher={false}
        />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-white/10 bg-brand-deep px-4 py-12 text-paper/65 md:px-8">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <BrandLogo variant="white" />
              <p className="mt-3 max-w-sm font-mono text-xs leading-relaxed">{t("app.tagline")}</p>
              <p className="mt-2 max-w-sm text-sm text-paper/80">{t("app.legal")}</p>
            </div>
            <nav
              className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.12em]"
              aria-label="Legal and help"
            >
              <Link href="/listings" className="text-[#9ed0e0] transition-colors hover:text-paper">
                {t("nav.listings")}
              </Link>
              <Link href="/refer" className="text-[#9ed0e0] transition-colors hover:text-paper">
                {t("nav.refer")}
              </Link>
              <Link href="/partners" className="text-[#9ed0e0] transition-colors hover:text-paper">
                {t("nav.partners")}
              </Link>
              <Link href="/ask" className="text-[#9ed0e0] transition-colors hover:text-paper">
                Ask
              </Link>
              <Link href="/help/faq" className="text-[#9ed0e0] transition-colors hover:text-paper">
                FAQ
              </Link>
              <Link href="/help/landlord" className="text-[#9ed0e0] transition-colors hover:text-paper">
                Landlord help
              </Link>
              <Link href="/help/tenant" className="text-[#9ed0e0] transition-colors hover:text-paper">
                Tenant help
              </Link>
              <Link href="/legal/terms" className="text-[#9ed0e0] transition-colors hover:text-paper">
                {t("nav.legal.terms")}
              </Link>
              <Link
                href="/legal/privacy"
                className="text-[#9ed0e0] transition-colors hover:text-paper"
              >
                {t("nav.legal.privacy")}
              </Link>
              <Link href="/inbox" className="text-[#9ed0e0] transition-colors hover:text-paper">
                {t("nav.inbox")}
              </Link>
            </nav>
          </div>
        </footer>
        {showAdminBar ? (
          <AdminSessionBar
            users={switchUsers}
            currentId={session?.id ?? adminSession!.id}
            tenantName={session?.tenantName ?? adminSession!.tenantName}
            role={session?.role ?? adminSession!.role}
            roleLevel={session?.roleLevel ?? adminSession!.roleLevel}
          />
        ) : null}
        <PwaRegister />
        <Toaster />
      </body>
    </html>
  )
}
