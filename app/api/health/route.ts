import { secretKeyConfigured, ENV_CHECKLIST, isProduction } from "@/lib/env"

export const dynamic = "force-dynamic"

/** Liveness for Railway / load balancers. Does not expose secret values. */
export async function GET() {
  const ok = !isProduction() || secretKeyConfigured()
  const body = {
    ok,
    service: "easy-rental",
    time: new Date().toISOString(),
    seedNote: "Demo fixture data is labelled DEMO · and isolated via is_demo flags",
    // In production only report whether required vars are present — never values.
    env: ENV_CHECKLIST.filter((item) => (isProduction() ? item.requiredInProd : true)).map(
      (item) => ({
        name: item.name,
        configured: Boolean(process.env[item.name]?.trim()),
        requiredInProd: item.requiredInProd,
      }),
    ),
  }
  return Response.json(body, { status: ok ? 200 : 503 })
}
