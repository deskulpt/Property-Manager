import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AdminSessionBar } from "@/components/admin/admin-session-bar"
import { MarketProvider } from "@/components/market-provider"
import { JsonLd } from "@/components/seo/json-ld"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { PwaRegister } from "@/components/pwa-register"
import { Toaster } from "@/components/ui/sonner"
import { shouldShowDemoSwitcher } from "@/lib/auth/provider"
import { listSessionUsers, unreadCount } from "@/lib/db"
import { mono, sans, serif } from "@/lib/fonts"
import { listLiveCountryPacks } from "@/lib/markets/store"
import { MARKET_COOKIE, normalizeMarketIso } from "@/lib/markets/cookie"
import { cookies } from "next/headers"
import { organizationJsonLd, websiteSearchActionJsonLd } from "@/lib/schema-org"
import { absoluteUrl, defaultOgImage } from "@/lib/seo"
import { getAdminSessionUser, getSessionUser } from "@/lib/session"

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
  openGraph: {
    type: "website",
    siteName: "Easy Rental",
    title: "Easy Rental",
    description:
      "Browse available industrial and multi-segment units — warehouse, commercial, retail, residential.",
    url: absoluteUrl("/"),
    images: [{ url: defaultOgImage() }],
  },
  twitter: {
    card: "summary",
    title: "Easy Rental",
    description: "Available spaces marketplace by DeSkulpt Inc.",
    images: [defaultOgImage()],
  },
  other: {
    "llms-txt": absoluteUrl("/llms.txt"),
  },
}

export const viewport: Viewport = {
  themeColor: "#13253A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const demoOn = shouldShowDemoSwitcher()
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
  const { ensureCountryPacksSchema } = await import("@/lib/markets/store")
  ensureCountryPacksSchema()
  const livePacks = listLiveCountryPacks()
  const liveIsos = livePacks.map((p) => p.iso)
  const jar = await cookies()
  const initialMarket = normalizeMarketIso(jar.get(MARKET_COOKIE)?.value ?? "IN")

  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
      data-market={initialMarket}
    >
      <body
        className={`flex min-h-full flex-col bg-paper font-sans text-ink ${showAdminBar ? "pb-20" : ""}`}
        data-theme="easyrental"
        data-admin-bar={showAdminBar ? "1" : undefined}
      >
        <MarketProvider initialMarket={initialMarket} liveIsos={liveIsos.length ? liveIsos : ["IN"]}>
          <JsonLd data={[organizationJsonLd(), websiteSearchActionJsonLd()]} />
          {demoOn && !showAdminBar ? (
            <div
              className="border-b border-amber-900/20 bg-amber-50 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-amber-950"
              data-testid="demo-auth-banner"
            >
              Demo identities — not for production. Set HOSTED=1 to require Sign up / Log in.
            </div>
          ) : null}
          <SiteHeader
            users={switchUsers}
            currentId={session?.id ?? ""}
            unread={unread}
            role={session?.role ?? null}
            signedIn={Boolean(session)}
            demoSwitcher={false}
          />
          <div className="flex-1">{children}</div>
          <SiteFooter />
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
        </MarketProvider>
      </body>
    </html>
  )
}
