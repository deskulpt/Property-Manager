import type { Metadata, Viewport } from "next"
import { Archivo, JetBrains_Mono, Newsreader } from "next/font/google"
import Link from "next/link"
import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { PwaRegister } from "@/components/pwa-register"
import { Toaster } from "@/components/ui/sonner"
import { listSessionUsers, unreadCount } from "@/lib/db"
import { t } from "@/lib/i18n"
import { getSessionUser } from "@/lib/session"

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["500", "600", "700", "800", "900"],
})

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
})

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "DeSkulpt",
    template: "%s · DeSkulpt",
  },
  description:
    "Multi-tenant industrial leasing desk. Browse bays, apply, and run a landlord portfolio with demo verification and demo payments.",
  applicationName: "DeSkulpt",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1C3F38",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [users, session] = await Promise.all([listSessionUsers(), getSessionUser()])
  const unread = session ? unreadCount(session.id) : 0

  return (
    <html
      lang="en"
      className={`${archivo.variable} ${newsreader.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <SiteHeader
          users={users.map((user) => ({
            id: user.id,
            name: user.name,
            role: user.role,
            tenantName: user.tenantName,
            trade: user.trade,
            serviceArea: user.serviceArea,
          }))}
          currentId={session?.id ?? ""}
          unread={unread}
        />
        <div className="flex-1">{children}</div>
        <footer className="bg-brand-deep px-4 py-10 text-paper/70 md:px-8">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-sans text-2xl font-black text-paper">
                {t("app.name")}
                <span className="text-terra">.</span>
              </p>
              <p className="mt-2 font-mono text-xs">{t("app.tagline")}</p>
            </div>
            <nav className="flex gap-4 font-mono text-xs" aria-label="Legal">
              <Link href="/legal/terms" className="text-[#E2A57E]">{t("nav.legal.terms")}</Link>
              <Link href="/legal/privacy" className="text-[#E2A57E]">{t("nav.legal.privacy")}</Link>
              <Link href="/inbox" className="text-[#E2A57E]">{t("nav.inbox")}</Link>
            </nav>
          </div>
        </footer>
        <PwaRegister />
        <Toaster />
      </body>
    </html>
  )
}
