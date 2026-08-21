// Scraped text column rendered into an href: https only, and only the exchange
// hosts the BSE scraper actually writes (every live row today is
// www.bseindia.com). Anything else keeps the headline but drops the link, so a
// poisoned row can't turn a company page into a phishing launcher.
const FILING_HOST_SUFFIXES = ["bseindia.com", "nseindia.com"];

export function safeFilingHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    const ok = FILING_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}
