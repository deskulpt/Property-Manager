/**
 * Thin HTTP helper for the Property-Manager desk.
 * Base URL from PROPERTY_MANAGER_BASE_URL (e.g. http://127.0.0.1:43123).
 * When unset or unreachable, callers return proposal/read stubs.
 */

export type PmJson = Record<string, unknown>;

export function pmBaseUrl(): string | null {
  const raw = process.env.PROPERTY_MANAGER_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export async function pmFetch(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; status: number; body: PmJson } | { ok: false; reason: string }> {
  const base = pmBaseUrl();
  if (!base) {
    return { ok: false, reason: "PROPERTY_MANAGER_BASE_URL unset" };
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    let body: PmJson = {};
    if (text) {
      try {
        body = JSON.parse(text) as PmJson;
      } catch {
        body = { raw: text };
      }
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: `HTTP ${res.status}: ${typeof body.error === "string" ? body.error : text.slice(0, 200)}`,
      };
    }
    return { ok: true, status: res.status, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: message };
  }
}

export function proposalId(prefix: string): string {
  return `prop_${prefix}_${Date.now().toString(36)}`;
}
