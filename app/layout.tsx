import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google"
import "./globals.css"
import { AdminSessionBar } from "@/components/admin/admin-session-bar"
import { BrandLogo } from "@/components/brand-logo"
import { SiteFooter } from "@/components/site-footer"
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
      </body>
    </html>
  )
}
