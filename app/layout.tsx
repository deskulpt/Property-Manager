import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google"
import "./globals.css"
import { AdminSessionBar } from "@/components/admin/admin-session-bar"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { PwaRegister } from "@/components/pwa-register"
import { Toaster } from "@/components/ui/sonner"
import { listSessionUsers, unreadCount } from "@/lib/db"
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
    "Industrial leasing desk for landlord organisations and property managers. Browse bays, apply as an occupant, and run a portfolio with verification and payments.",
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
    title: "Easy Rental",
    description:
      "Industrial leasing desk for India C&I — list once, lease direct, no brokerage.",
    url: "https://easyrental.space",
    siteName: "Easy Rental",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/logo.png", alt: "Easy Rental" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Easy Rental",
    description:
      "Industrial leasing desk for India C&I — list once, lease direct, no brokerage.",
    images: ["/logo.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#13253A",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Session cookies first — skip the full role-switcher user list for anonymous traffic.
  const [session, adminSession] = await Promise.all([getSessionUser(), getAdminSessionUser()])
  const needsSwitcher = Boolean(session || adminSession)
  const users = needsSwitcher ? listSessionUsers() : []
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
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader
          users={switchUsers}
          currentId={session?.id ?? ""}
          unread={unread}
          role={session?.role ?? null}
          signedIn={Boolean(session)}
        />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        {showAdminBar ? (
          <AdminSessionBar
            users={switchUsers}
            currentId={session?.id ?? adminSession!.id}
            tenantName={session?.tenantName ?? adminSession!.tenantName}
            role={session?.role ?? adminSession!.role}
          />
        ) : null}
        <PwaRegister />
        <Toaster />
      </body>
    </html>
  )
}
