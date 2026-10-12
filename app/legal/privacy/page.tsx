import { PageHeader } from "@/components/product"

export const metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader kicker="Legal" title="Privacy Policy" lede="What this build stores, what it refuses to store, and what the demo pretends to send." />
      <div className="grid gap-5 text-[17px] leading-relaxed text-ink-soft">
        <p>DeSkulpt does not sell personal information. The demo does not have a data broker, an advertising pixel, or a customer list. If you operate the software for a real portfolio, you become the controller of whatever you choose to collect, and you should replace this policy with one that matches that operation.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">What the demo stores</h2>
        <p>A local SQLite file holds seeded names, example emails on the .example domain, applications you submit, floor-plan images you upload, hotspot positions, ledger rows, job status, and verification metadata: country, region, document type, original filename, and a simulated score. A cookie named deskulpt_user remembers which fixture you picked.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">What it does not store</h2>
        <p>Document uploads and face images are read for a filename and a local preview, then discarded. The server does not write those bytes to disk and does not keep a biometric template. Full card numbers are never requested. The payment form asks for four digits so the ledger can show a masked demo method.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">Verification</h2>
        <p>The wizard is labeled as a demo on the screen where you use it. Choosing India selects Aadhaar as the document type. Choosing another country selects a driving licence. Neither path calls UIDAI, a motor-vehicle agency, or any other government API. A “match” is a simulated number. It is not an identity proof.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">Payments, email, and push</h2>
        <p>The demo payment adapter returns a reference and writes a ledger line. It does not contact a processor. Email and web push are interfaces. The demo sender writes extra inbox rows marked email_demo and push_demo. It does not send mail and it does not subscribe a browser to a push service.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">Floor plans and unit media</h2>
        <p>Public bay pages show photographs, a GIF, a video, a 360 image, and an optional iframe URL. Those media files ship with the demo. A Matterport URL is loaded by the visitor’s browser from Matterport, not by a vendor SDK inside this app. Uploaded floor plans stay on the machine that runs the server.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">Cookies and the service worker</h2>
        <p>The session cookie is a demo convenience. The service worker caches icons and media so the installed app has something to show. It does not cache your ledger or your applications.</p>
      </div>
    </article>
  )
}
