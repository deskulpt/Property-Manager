import { AddLanguageForm } from "@/components/cms/add-language-form"
import { PageHeader, RoleGate } from "@/components/product"
import { listLanguages } from "@/lib/db"
import { t } from "@/lib/i18n"
import { staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"
import { translationConfigured } from "@/lib/translate"

export const metadata = { title: "Languages" }

export default async function CmsLanguagesPage() {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!caps?.manageLanguages) {
    return (
      <RoleGate
        title="Languages"
        body="Sign in as Avery Quinn (Super Admin) — or impersonate from the L0 sticky bar — to add interface languages."
      />
    )
  }
  const languages = listLanguages()
  const keyConfigured = translationConfigured()
  return (
    <div>
      <PageHeader kicker="i18n" title={t("cms.languages.title")} lede={t("cms.languages.lede")} />
      <section className="mb-8">
        <h2 className="mb-3 font-sans text-lg font-extrabold">{t("cms.languages.add")}</h2>
        <AddLanguageForm
          keyConfigured={keyConfigured}
          labels={{
            code: t("cms.languages.code"),
            name: t("cms.languages.name"),
            submit: t("cms.languages.add"),
            noKeyHint: t("cms.languages.no_key_hint"),
          }}
        />
      </section>
      <ul className="grid gap-3">
        {languages.map((language) => (
          <li key={language.code} className="bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-sans text-lg font-extrabold">
                  {language.name}{" "}
                  <span className="font-mono text-sm font-normal text-ink-faint">({language.code})</span>
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {language.code === "en"
                    ? t("cms.languages.english")
                    : language.status === "waiting_for_key"
                      ? language.waitingReason ?? t("cms.languages.waiting")
                      : t("cms.languages.ready")}
                </p>
              </div>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  language.status === "waiting_for_key" ? "text-terra" : "text-avail"
                }`}
                data-testid={language.status === "waiting_for_key" ? "language-waiting" : "language-ready"}
              >
                {language.status === "waiting_for_key" ? t("cms.languages.waiting") : language.code === "en" ? "source" : t("cms.languages.ready")}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
