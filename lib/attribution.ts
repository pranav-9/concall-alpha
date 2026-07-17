// First-touch acquisition attribution: parsing + classification shared by the
// page-view tracker (client), the track API route (server), and the admin report.
// Pure functions only — no Next.js or Supabase imports.

export type UtmParams = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

export const MAX_REFERRER_LENGTH = 2048;
export const MAX_UTM_LENGTH = 200;

const UTM_KEYS = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_content", "utmContent"],
  ["utm_term", "utmTerm"],
] as const;

export function sanitizeUtmValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_UTM_LENGTH);
}

export function parseUtmParams(search: string): UtmParams {
  const out: UtmParams = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
  };
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return out;
  }
  for (const [queryKey, field] of UTM_KEYS) {
    out[field] = sanitizeUtmValue(params.get(queryKey));
  }
  return out;
}

export function extractReferrerHost(referrer: string | null | undefined): string | null {
  if (typeof referrer !== "string" || !referrer.trim()) return null;
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.hostname.toLowerCase() || null;
}

export function isInternalHost(host: string | null, ownHosts: readonly string[]): boolean {
  if (!host) return true;
  // Preview deployments and the historical self-referrer host all live on
  // *.vercel.app; genuine external referrals from there are negligible.
  if (host.endsWith(".vercel.app")) return true;
  for (const own of ownHosts) {
    if (host === own || host === `www.${own}` || own === `www.${host}`) return true;
  }
  return false;
}

export function normalizeExternalReferrer(
  referrer: unknown,
  ownHosts: readonly string[],
): string | null {
  if (typeof referrer !== "string") return null;
  const trimmed = referrer.trim();
  if (!trimmed || trimmed.length > MAX_REFERRER_LENGTH) return null;
  const host = extractReferrerHost(trimmed);
  if (!host || isInternalHost(host, ownHosts)) return null;
  return trimmed;
}

function hostFromEnvValue(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function getOwnHosts(env: Record<string, string | undefined>): string[] {
  const hosts = [
    hostFromEnvValue(env.NEXT_PUBLIC_SITE_URL),
    hostFromEnvValue(env.VERCEL_URL),
    hostFromEnvValue(env.VERCEL_PROJECT_PRODUCTION_URL),
    "localhost",
    "127.0.0.1",
  ].filter((host): host is string => Boolean(host));
  return Array.from(new Set(hosts));
}
