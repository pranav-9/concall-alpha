// Compact "what management guided" accent for the watchlist / Overall Forward
// cell — the FACT (management's own stated number) sitting next to our analytical
// outlook score.
//
// Why text-parsed: the guidance value is NOT stored as a structured number — the
// DB `details`/`trail` are sparse, the figure only lives in the free-text
// `guidance_text`. We extract the % from `guidance_text` ONLY (the canonical
// statement), taking the LAST match so an in-text "revised to X" reports X.
//
// `latest_view` is deliberately NOT a number source: it was observed to carry
// figures from OTHER metrics/items (e.g. a margin %, or a stray number for a
// company whose revenue guide is qualitative), which produced wrong headlines
// (SANSERA "7.6%" vs "teens", MOLDTKPAC "12–15%" vs a ₹1,000cr target). It is
// used only as a fallback for the tooltip text when guidance_text is empty.
//
// Scope on purpose: REVENUE-type, CURRENT-FY (FY26/FY27) rows, and only when a
// real % is present. Coverage is ~10% of the universe (measured) — most companies
// show nothing, which is correct. This is an accent, not a column. The full
// statement (incl. metric quirks and revised status) rides in the tooltip so a
// terse headline never misleads on its own.

export type HeadlineGuidanceRow = {
  company_code?: string | null;
  guidance_type?: string | null;
  target_period?: string | null;
  status?: string | null;
  guidance_text?: string | null;
  latest_view?: string | null;
};

export type HeadlineGuidance = {
  /** e.g. "15–20% FY26" — the compact accent. */
  label: string;
  /** Full management statement (+ status) for the tooltip. */
  detail: string;
};

const CURRENT_FY = /fy\s?2[67]/i; // FY26 / FY27, incl. "Q4 FY26"
// A single % ("~30%") or a range ("12-15%", "15% to 20%"). Global: we take the
// LAST match so a "revised to X" statement reports X, not the original.
const PCT = /(\d+(?:\.\d+)?)\s*%?\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%/gi;

const extractPercent = (text: string | null | undefined): string | null => {
  if (!text) return null;
  let last: string | null = null;
  for (const m of text.matchAll(PCT)) {
    if (m[1] && m[2]) last = `${m[1]}–${m[2]}%`;
    else if (m[3]) last = `${m[3]}%`;
  }
  return last;
};

const fyLabel = (period: string | null | undefined): string | null => {
  if (!period) return null;
  const years = [...period.matchAll(/fy\s?(\d{2})/gi)].map((m) => m[1]);
  if (years.length === 0) return null;
  return years.length > 1 ? `FY${years[0]}+` : `FY${years[0]}`;
};

// Segment / sub-scope detection. The headline should be OVERALL company revenue,
// not a division's. There's no structured scope field (the proper fix is a scope
// tag in the Phase-6 guidance extraction upstream), so we detect it from text:
//   - an explicit "segment" / "division" / "vertical"
//   - a named segment/geography as the SUBJECT of revenue ("CDMO/CMO revenue",
//     "domestic India business revenue", "ARV business revenue") — note this must
//     bind the qualifier TO "revenue", so a row that merely cites "CDMO momentum"
//     as a driver of OVERALL growth (ACUTAAS) is kept.
//   - a sub-metric, not a growth rate ("same-store", "revenue share", "value-added")
const SEGMENT_WORD = /\b(segment|division|vertical|sub-?segment)\b/i;
const SEGMENT_REVENUE =
  /\b(cdmo|cmo|arv|ads|api|domestic|exports?|overseas|standalone)\b[\s/&,-]*(?:and\s+)?(?:[\w.-]+\s+){0,2}revenue/i;
const BUSINESS_REVENUE = /\b[\w-]+\s+business\s+revenue\b/i;
const SUB_METRIC = /\b(same-?store|revenue share|value-?added)\b/i;

const isSegmentScoped = (text: string | null | undefined): boolean => {
  const t = text ?? "";
  return (
    SEGMENT_WORD.test(t) || SEGMENT_REVENUE.test(t) || BUSINESS_REVENUE.test(t) || SUB_METRIC.test(t)
  );
};

// guidance_type is sometimes mislabeled "revenue" while the text is really about
// a profit metric (AARTIPHARM: "Standalone EBITDA growth ... 8-12%"). Exclude
// pure profit guidance, but KEEP any top-line subject (revenue / volume / AUM /
// turnover), so CCL's "volume and EBITDA growth" still counts as growth.
const TOPLINE_SUBJECT = /\b(revenue|top-?line|turnover|sales|volume|aum|run-?rate|disbursement)\b/i;
const PROFIT_METRIC = /\b(ebitda|margin|pat|profit|earnings|bottom-?line)\b/i;
const isProfitMetricOnly = (text: string | null | undefined): boolean => {
  const t = text ?? "";
  return PROFIT_METRIC.test(t) && !TOPLINE_SUBJECT.test(t);
};

const periodScore = (row: HeadlineGuidanceRow): number => {
  const p = (row.target_period ?? "").toLowerCase();
  let s = 0;
  if (/fy\s?27/.test(p)) s += 2; // prefer the current FY (FY27)
  else if (/fy\s?26/.test(p)) s += 1;
  if ((row.status ?? "").toLowerCase() === "active") s += 0.5; // standing > closed
  return s;
};

// Pick the single headline guidance for one company from its guidance_tracking
// rows. Returns null when there's no revenue, current-FY, numeric guidance.
export function pickHeadlineGuidance(rows: HeadlineGuidanceRow[]): HeadlineGuidance | null {
  const candidates = rows
    .filter((r) => (r.guidance_type ?? "").toLowerCase() === "revenue")
    .filter((r) => !isSegmentScoped(r.guidance_text)) // overall company, not a division
    .filter((r) => !isProfitMetricOnly(r.guidance_text)) // top-line growth, not EBITDA/PAT
    .filter((r) => CURRENT_FY.test(r.target_period ?? ""))
    .map((r) => ({ r, pct: extractPercent(r.guidance_text) }))
    .filter((c): c is { r: HeadlineGuidanceRow; pct: string } => c.pct != null)
    .sort((a, b) => periodScore(b.r) - periodScore(a.r));

  const best = candidates[0];
  if (!best) return null;

  const fy = fyLabel(best.r.target_period);
  const label = fy ? `${best.pct} ${fy}` : best.pct;
  const text = (best.r.guidance_text ?? best.r.latest_view ?? "").replace(/\s+/g, " ").trim();
  const status = (best.r.status ?? "").toLowerCase();
  const statusSuffix = status && status !== "active" ? ` · ${status}` : "";
  const detail = text ? `Management: ${text}${statusSuffix}` : `Management guided ${label}`;
  return { label, detail };
}
