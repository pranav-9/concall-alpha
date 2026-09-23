import { buildForensicChecks, tallyChecks } from "./forensics";
import { cagrPct, formatPct, formatPp, rangeLabel } from "./format";
import { financialsRead, forensicRead, laggingProfitYears, returnsRead } from "./reads";
import {
  parseCompanyQualityPayload,
  type CompanyQualityRow,
  type CompanyQualityV1,
  type NormalizedCompanyQuality,
  type NormalizedQualityFinancials,
  type NormalizedQualityForensics,
  type NormalizedQualityOwnership,
  type NormalizedQualityReturns,
  type QualityFiscalYear,
  type QualityHoldingBand,
  type QualityRatioRow,
} from "./types";

const series = (years: QualityFiscalYear[], pick: (y: QualityFiscalYear) => number | null | undefined) =>
  years.map((y) => ({ label: y.label, value: pick(y) ?? null }));

const ratioRow = (
  key: QualityRatioRow["key"],
  label: string,
  years: QualityFiscalYear[],
  pick: (y: QualityFiscalYear) => number | null | undefined,
): QualityRatioRow | null => {
  const points = series(years, pick);
  const present = points.filter((p) => p.value != null);
  if (present.length < 2) return null;
  return {
    key,
    label,
    points,
    latest: present[present.length - 1].value,
    first: present[0].value,
  };
};

function normalizeFinancials(payload: CompanyQualityV1): NormalizedQualityFinancials | null {
  const years = payload.fiscal_years;
  if (years.length === 0) return null;
  const withRevenue = years.filter((y) => y.revenue != null);
  if (withRevenue.length === 0) return null;
  const first = years[0];
  const latest = years[years.length - 1];
  const span = years.length - 1;
  return {
    yearRange: rangeLabel(years.map((y) => y.label)),
    years: years.map((y) => y.label),
    revenue: series(years, (y) => y.revenue),
    netProfit: series(years, (y) => y.net_profit),
    revenueLatest: latest.revenue,
    netProfitLatest: latest.net_profit,
    revenueCagrPct: span > 0 ? cagrPct(first.revenue, latest.revenue, span) : null,
    netProfitCagrPct: span > 0 ? cagrPct(first.net_profit, latest.net_profit, span) : null,
    laggingYears: laggingProfitYears(years),
    read: payload.reads.financials ?? financialsRead(years),
  };
}

function normalizeReturns(payload: CompanyQualityV1): NormalizedQualityReturns | null {
  const years = payload.fiscal_years;
  const financial = payload.statement_model === "financial";
  const returns = [
    ratioRow("roce", "ROCE", years, (y) => y.roce_pct),
    ratioRow("roe", "ROE", years, (y) => y.roe_pct),
    ratioRow("roic", "ROIC", years, (y) => y.roic_pct),
  ].filter((r): r is QualityRatioRow => r != null);
  const margins = [
    financial ? null : ratioRow("gross", "Gross", years, (y) => y.gross_margin_pct),
    ratioRow("ebitda", financial ? "Financing" : "EBITDA", years, (y) => y.ebitda_margin_pct),
    ratioRow("net", "Net", years, (y) => y.net_margin_pct),
  ].filter((r): r is QualityRatioRow => r != null);
  if (returns.length === 0 && margins.length === 0) return null;
  return {
    yearRange: rangeLabel(years.map((y) => y.label)),
    returns,
    margins,
    read: payload.reads.returns ?? returnsRead(years, financial),
  };
}

const BAND_LABELS: Record<QualityHoldingBand, string> = {
  promoters: "Promoter",
  fiis: "FII",
  diis: "DII",
  public: "Public",
};

function normalizeOwnership(payload: CompanyQualityV1): NormalizedQualityOwnership | null {
  const quarters = payload.shareholding.quarters;
  if (quarters.length === 0) return null;
  const rows = quarters.map((q) => {
    const promoters = q.promoters ?? 0;
    const fiis = q.fiis ?? 0;
    const diis = q.diis ?? 0;
    // Government and "others" ride in the public band so the bar always sums to 100.
    const publicBand = Math.max(0, 100 - promoters - fiis - diis);
    return { period: q.period, bands: { promoters, fiis, diis, public: publicBand } };
  });
  const first = rows[0];
  const latest = rows[rows.length - 1];
  const bands: QualityHoldingBand[] = ["promoters", "fiis", "diis", "public"];
  const summary = bands.map((band) => ({
    band,
    label: BAND_LABELS[band],
    latest: latest.bands[band],
    change: rows.length > 1 ? latest.bands[band] - first.bands[band] : null,
  }));

  const promoterDelta = rows.length > 1 ? latest.bands.promoters - first.bands.promoters : 0;
  const instDelta = rows.length > 1 ? latest.bands.fiis + latest.bands.diis - (first.bands.fiis + first.bands.diis) : 0;
  const publicDelta = rows.length > 1 ? latest.bands.public - first.bands.public : 0;
  const n = rows.length - 1;
  const window = n === 1 ? "one quarter" : `${n} quarters`;

  let lead: string;
  let rest: string;
  if (quarters.every((q) => q.promoters == null) && Math.abs(instDelta) >= 0.5) {
    lead = instDelta > 0 ? "Institutions are adding." : "Institutions are trimming.";
    rest = `FII + DII ${formatPp(instDelta)} pts over ${window}; public holding ${formatPp(publicDelta)} pts. No promoter group.`;
  } else if (Math.abs(instDelta) < 0.5 && Math.abs(promoterDelta) < 0.5) {
    lead = "The register has barely moved.";
    rest = `Promoter, institutional and public holdings all within half a point over ${window}.`;
  } else if (instDelta >= 0.5 && publicDelta <= -0.5) {
    lead = "Institutions are buying what retail is selling.";
    rest = `FII + DII ${formatPp(instDelta)} pts over ${window}; public holding ${formatPp(publicDelta)} pts.`;
  } else if (instDelta <= -0.5 && publicDelta >= 0.5) {
    lead = "Institutions are trimming; retail is absorbing.";
    rest = `FII + DII ${formatPp(instDelta)} pts over ${window}; public holding ${formatPp(publicDelta)} pts.`;
  } else if (promoterDelta <= -0.5) {
    lead = "The promoter stake has come down.";
    rest = `Promoters ${formatPp(promoterDelta)} pts over ${window}; institutions ${formatPp(instDelta)} pts.`;
  } else if (promoterDelta >= 0.5) {
    lead = "Promoters have added to their stake.";
    rest = `Promoters ${formatPp(promoterDelta)} pts over ${window}; institutions ${formatPp(instDelta)} pts.`;
  } else {
    lead = "Institutional holding is shifting.";
    rest = `FII + DII ${formatPp(instDelta)} pts over ${window}; public holding ${formatPp(publicDelta)} pts.`;
  }

  // Professionally run companies (COFORGE) carry no promoter row at all.
  const noPromoter = quarters.every((q) => q.promoters == null);
  const stance: "Buyer" | "Seller" | "Neutral" | null =
    noPromoter || rows.length < 2 ? null : promoterDelta >= 0.5 ? "Buyer" : promoterDelta <= -0.5 ? "Seller" : "Neutral";
  const pledged = noPromoter ? null : payload.annual_report_checks.promoter_pledge_pct;
  const holdingWord =
    stance === "Buyer" ? "adding" : stance === "Seller" ? "trimming" : "holding steady";
  const pledgeWord = pledged == null ? "pledge not tracked yet" : pledged <= 0 ? "nothing pledged" : `${formatPct(pledged)} pledged`;
  const headline = noPromoter
    ? "No promoter group on the register; institutions and the public own the company."
    : `${formatPct(latest.bands.promoters)} promoter stake, ${holdingWord}, ${pledgeWord}.`;

  const events: Array<{ when: string; text: string }> = [];
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i].bands.promoters - rows[i - 1].bands.promoters;
    if (Math.abs(d) >= 0.3) {
      events.push({
        when: rows[i].period,
        text: `Promoter holding ${d > 0 ? "rose" : "fell"} ${formatPp(Math.abs(d)).replace("+", "")} pts to ${formatPct(rows[i].bands.promoters)}.`,
      });
    }
  }
  const firstQ = quarters[0];
  const lastQ = quarters[quarters.length - 1];
  if (firstQ.shareholders != null && lastQ.shareholders != null && quarters.length > 1 && firstQ.shareholders > 0) {
    const chg = ((lastQ.shareholders - firstQ.shareholders) / firstQ.shareholders) * 100;
    if (Math.abs(chg) >= 5) {
      events.push({
        when: lastQ.period,
        text: `Shareholder count ${chg > 0 ? "up" : "down"} ${formatPct(Math.abs(chg), 0)} over ${window}, to ${new Intl.NumberFormat("en-IN").format(lastQ.shareholders)}.`,
      });
    }
  }

  return {
    quarterRange: rangeLabel(rows.map((r) => r.period)),
    quarters: rows,
    summary,
    takeaway: { lead, rest },
    promoters: { headline, pledgedPct: pledged, stance, events: events.reverse().slice(0, 4) },
  };
}

function normalizeForensics(payload: CompanyQualityV1): NormalizedQualityForensics | null {
  if (payload.fiscal_years.length === 0) return null;
  const checks = buildForensicChecks(payload);
  const tally = tallyChecks(checks);
  const latest = payload.fiscal_years[payload.fiscal_years.length - 1];
  const asOf = payload.annual_report_checks.as_of ?? latest.label;
  return {
    asOfLabel: `${asOf} statements`,
    checks,
    tally,
    read: payload.reads.forensic ?? forensicRead(checks, tally),
  };
}

export function normalizeCompanyQuality(row: CompanyQualityRow | null | undefined): NormalizedCompanyQuality | null {
  if (!row) return null;
  const payload = parseCompanyQualityPayload(row.payload);
  if (!payload) return null;
  return {
    companyCode: payload.company_code,
    statementModel: payload.statement_model,
    generatedAtRaw: row.generated_at ?? payload.source.scraped_at ?? null,
    sourceVariant: payload.source.variant,
    sourceNotes: payload.source.notes ?? [],
    financials: normalizeFinancials(payload),
    returns: normalizeReturns(payload),
    ownership: normalizeOwnership(payload),
    forensics: normalizeForensics(payload),
  };
}
