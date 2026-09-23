import { formatMultiple, formatPct, formatPlain } from "./format";
import type {
  CompanyQualityV1,
  ForensicCheck,
  ForensicStatus,
  ForensicTally,
  QualityFiscalYear,
} from "./types";

/**
 * The nine forensic checks, in fixed order. Every numeric status comes from a
 * threshold rule in this file — the payload carries raw statement rows only.
 * A check whose input is not on the statements (annual-report items) is
 * `not_assessed` until `annual_report_checks` is filled; a check that does not
 * apply to a bank / NBFC statement model is `not_applicable`. Both stay out of
 * the tally and render muted — never as Clean.
 */

// Thresholds (Business Analysis Framework v14 §5 forensic screen, tuned on the
// covered universe 2026-09). Kept together so a reviewer can read the rules in one place.
export const FORENSIC_THRESHOLDS = {
  cfoPat: { watch: 0.8, flag: 0.5 }, // 5-year sum ratio; below watch → Watch, below flag → Flag
  debtorDays: { watch: 90, flag: 150, risePctWatch: 20, risePctFlag: 40 },
  netDebtEbitda: { watch: 1.5, flag: 3 },
  interestCover: { watch: 4, flag: 2 },
  relatedPartyPct: { watch: 5, flag: 15 },
  pledgePct: { watch: 0.01, flag: 10 },
  contingentPct: { watch: 10, flag: 25 },
  otherIncomePct: { watch: 10, flag: 25 },
  dilutionPct: { watch: 1, flag: 5 },
} as const;

const NAMES: Record<ForensicCheck["id"], string> = {
  profit_to_cash: "Profit → cash",
  receivable_days: "Receivable days",
  debt_load: "Debt load",
  related_party: "Related-party dealings",
  promoter_pledge: "Promoter pledge",
  auditor: "Auditor",
  contingent_liabilities: "Contingent liabilities",
  other_income: "Other income",
  equity_dilution: "Equity dilution",
};

const notAssessed = (id: ForensicCheck["id"], note: string): ForensicCheck => ({
  id,
  name: NAMES[id],
  status: "not_assessed",
  metric: "Not assessed",
  note,
});

const notApplicable = (id: ForensicCheck["id"], note: string): ForensicCheck => ({
  id,
  name: NAMES[id],
  status: "not_applicable",
  metric: "Not applicable",
  note,
});

const grade = (value: number, watch: number, flag: number, higherIsWorse = true): ForensicStatus => {
  if (higherIsWorse) {
    if (value >= flag) return "flag";
    if (value >= watch) return "watch";
    return "clean";
  }
  if (value <= flag) return "flag";
  if (value <= watch) return "watch";
  return "clean";
};

const last = <T>(xs: readonly T[]): T | undefined => xs[xs.length - 1];

function profitToCash(years: QualityFiscalYear[]): ForensicCheck {
  const id = "profit_to_cash";
  const usable = years.filter((y) => y.cfo != null && y.net_profit != null && y.net_profit > 0);
  if (usable.length < 2) {
    return notAssessed(id, "Needs at least two profitable years with a cash-flow statement.");
  }
  const cfo = usable.reduce((s, y) => s + (y.cfo ?? 0), 0);
  const pat = usable.reduce((s, y) => s + (y.net_profit ?? 0), 0);
  const ratio = cfo / pat;
  const latest = last(usable);
  const latestRatio =
    latest && latest.cfo != null && latest.net_profit ? latest.cfo / latest.net_profit : null;
  const { watch, flag } = FORENSIC_THRESHOLDS.cfoPat;
  const status = grade(ratio, watch, flag, false);
  const span = `${usable.length}-year total`;
  const latestPart = latestRatio != null && latest ? ` ${latest.label} alone was ${formatMultiple(latestRatio, 2)}.` : "";
  const note =
    status === "clean"
      ? `${span}: operating cash keeps pace with reported profit.${latestPart}`
      : status === "watch"
        ? `${span}: a fifth or more of reported profit has not yet arrived as operating cash.${latestPart}`
        : `${span}: less than half of reported profit has turned into operating cash.${latestPart}`;
  return { id, name: NAMES[id], status, metric: `CFO / PAT ${formatMultiple(ratio, 2)}`, note };
}

function receivableDays(years: QualityFiscalYear[]): ForensicCheck {
  const id = "receivable_days";
  const withDays = years.filter((y) => y.debtor_days != null);
  const latest = last(withDays);
  if (!latest || latest.debtor_days == null) {
    return notAssessed(id, "Screener carries no debtor-days row for this company.");
  }
  const days = latest.debtor_days;
  const base = withDays.length >= 3 ? withDays[withDays.length - 3] : withDays[0];
  const baseDays = base?.debtor_days ?? null;
  const risePct = baseDays && baseDays > 0 ? ((days - baseDays) / baseDays) * 100 : null;
  const t = FORENSIC_THRESHOLDS.debtorDays;
  let status: ForensicStatus = grade(days, t.watch, t.flag);
  // A rising trend only matters once collections take a meaningful time; 10 → 25
  // days is still cash on delivery.
  const trendMatters = days >= t.watch / 2;
  if (risePct != null && risePct >= t.risePctFlag && days >= t.watch) status = "flag";
  else if (risePct != null && risePct >= t.risePctWatch && trendMatters && status === "clean") status = "watch";
  const trend =
    baseDays != null && base
      ? days > baseDays
        ? `up from ${formatPlain(baseDays, 0)} in ${base.label}`
        : days < baseDays
          ? `down from ${formatPlain(baseDays, 0)} in ${base.label}`
          : `flat since ${base.label}`
      : "no earlier year to compare";
  const note =
    status === "clean"
      ? `Customers pay within about ${Math.round(days / 30)} months; ${trend}.`
      : status === "watch"
        ? `Collections are slow or slowing; ${trend}.`
        : `Customers take ${Math.round(days / 30)}+ months to pay; ${trend}. Cash and reported revenue are drifting apart.`;
  return { id, name: NAMES[id], status, metric: `${formatPlain(days, 0)} days`, note };
}

function debtLoad(years: QualityFiscalYear[]): ForensicCheck {
  const id = "debt_load";
  const latest = last(years);
  if (!latest || latest.net_debt == null || latest.operating_profit == null) {
    return notAssessed(id, "Borrowings or operating profit missing from the statements.");
  }
  const ebitda = latest.operating_profit;
  const ebit = ebitda - (latest.depreciation ?? 0);
  const cover = latest.interest && latest.interest > 0 ? ebit / latest.interest : null;
  if (latest.net_debt <= 0) {
    return {
      id,
      name: NAMES[id],
      status: "clean",
      metric: "Net cash",
      note: `Cash exceeds borrowings by ₹${formatPlain(Math.abs(latest.net_debt), 0)} cr.${cover != null ? ` Interest cover ${formatMultiple(cover)}.` : ""}`,
    };
  }
  if (ebitda <= 0) {
    return {
      id,
      name: NAMES[id],
      status: "flag",
      metric: `Net debt ₹${formatPlain(latest.net_debt, 0)} cr`,
      note: "Borrowings with no operating profit to service them.",
    };
  }
  const ratio = latest.net_debt / ebitda;
  const t = FORENSIC_THRESHOLDS.netDebtEbitda;
  let status = grade(ratio, t.watch, t.flag);
  if (cover != null) {
    const coverStatus = grade(cover, FORENSIC_THRESHOLDS.interestCover.watch, FORENSIC_THRESHOLDS.interestCover.flag, false);
    if (coverStatus === "flag") status = "flag";
    else if (coverStatus === "watch" && status === "clean") status = "watch";
  }
  const coverPart = cover != null ? `Interest cover ${formatMultiple(cover)}.` : "Interest cover not computable.";
  const note =
    status === "clean"
      ? `${coverPart} Borrowings are comfortably serviced from operating profit.`
      : status === "watch"
        ? `${coverPart} Debt is serviceable but a weak year would show.`
        : `${coverPart} Debt is heavy relative to what the business earns.`;
  return { id, name: NAMES[id], status, metric: `Net debt / EBITDA ${formatMultiple(ratio)}`, note };
}

function otherIncome(years: QualityFiscalYear[]): ForensicCheck {
  const id = "other_income";
  const latest = last(years);
  if (!latest || latest.other_income == null || latest.pbt == null || latest.pbt <= 0) {
    return notAssessed(id, "Needs a profitable year with an other-income row.");
  }
  const pct = (latest.other_income / latest.pbt) * 100;
  const t = FORENSIC_THRESHOLDS.otherIncomePct;
  const status = grade(pct, t.watch, t.flag);
  const note =
    status === "clean"
      ? "Profit comes from operations, not treasury or one-offs."
      : status === "watch"
        ? "A meaningful slice of pre-tax profit is interest, dividends or one-offs rather than the business."
        : "Most of the pre-tax profit is not operating profit; the headline number overstates the business.";
  return { id, name: NAMES[id], status, metric: `${formatPct(pct, 0)} of PBT`, note };
}

function equityDilution(years: QualityFiscalYear[]): ForensicCheck {
  const id = "equity_dilution";
  const latest = last(years);
  const prior = years.length >= 2 ? years[years.length - 2] : undefined;
  if (!latest || !prior || latest.equity_capital == null || prior.equity_capital == null || prior.equity_capital <= 0) {
    return notAssessed(id, "Needs two years of paid-up equity capital.");
  }
  const rise = latest.equity_capital - prior.equity_capital;
  let pct = (rise / prior.equity_capital) * 100;
  // A bonus issue capitalises reserves: equity capital jumps while reserves fall
  // by about the same amount. That is not dilution.
  const reservesDrop =
    latest.reserves != null && prior.reserves != null ? prior.reserves - latest.reserves : null;
  const bonusLike = rise > 0 && reservesDrop != null && reservesDrop >= rise * 0.8;
  if (bonusLike) pct = 0;
  const t = FORENSIC_THRESHOLDS.dilutionPct;
  const status = pct <= 0 ? "clean" : grade(pct, t.watch, t.flag);
  const metric = pct <= 0 ? "No new shares" : `${formatPct(pct, 1)} in ${latest.label}`;
  const note = bonusLike
    ? `Equity capital rose in ${latest.label} but reserves fell by the same amount: a bonus issue, not new money.`
    : pct <= 0
      ? `Paid-up capital unchanged through ${latest.label} (share count from equity capital; buybacks and splits not separated).`
      : status === "watch"
        ? `Paid-up capital grew in ${latest.label}: a small issue, ESOPs or a preferential allotment. Worth tracking if repeated.`
        : `Paid-up capital grew sharply in ${latest.label}. Check what the new shares bought.`;
  return { id, name: NAMES[id], status, metric, note };
}

function relatedParty(ar: CompanyQualityV1["annual_report_checks"]): ForensicCheck {
  const id = "related_party";
  const pct = ar.related_party_pct_revenue;
  if (pct == null) return notAssessed(id, "Needs the related-party schedule from the annual report.");
  const t = FORENSIC_THRESHOLDS.relatedPartyPct;
  const status = grade(pct, t.watch, t.flag);
  const note =
    status === "clean"
      ? "Dealings with promoter or group entities are a small share of revenue."
      : status === "watch"
        ? "A meaningful share of revenue runs through related parties; terms matter."
        : "A large share of revenue runs through related parties; the reported numbers depend on those terms.";
  return { id, name: NAMES[id], status, metric: `${formatPct(pct, 1)} of revenue`, note };
}

function promoterPledge(ar: CompanyQualityV1["annual_report_checks"]): ForensicCheck {
  const id = "promoter_pledge";
  const pct = ar.promoter_pledge_pct;
  if (pct == null) return notAssessed(id, "Needs the pledge line from the shareholding filing.");
  const t = FORENSIC_THRESHOLDS.pledgePct;
  const status = pct <= 0 ? "clean" : grade(pct, t.watch, t.flag);
  const note =
    status === "clean"
      ? "No promoter shares pledged."
      : status === "watch"
        ? "Some promoter shares are pledged as loan collateral."
        : "A large slice of the promoter holding is pledged; a falling share price can force selling.";
  return { id, name: NAMES[id], status, metric: `${formatPct(pct, 1)} pledged`, note };
}

function auditor(ar: CompanyQualityV1["annual_report_checks"]): ForensicCheck {
  const id = "auditor";
  const a = ar.auditor;
  if (!a) return notAssessed(id, "Needs the auditor's report from the annual report.");
  const remarks = a.caro_remarks ?? 0;
  let status: ForensicStatus = "clean";
  if (a.opinion === "adverse" || a.opinion === "disclaimer") status = "flag";
  else if (a.opinion === "qualified" || remarks > 0) status = "watch";
  const opinionLabel = a.opinion.charAt(0).toUpperCase() + a.opinion.slice(1);
  const tenure = a.tenure_years != null ? `Same auditor ${a.tenure_years} years` : "Tenure not recorded";
  const remarkPart = remarks > 0 ? `${remarks} CARO / emphasis-of-matter remark${remarks === 1 ? "" : "s"}.` : "no CARO or emphasis-of-matter remarks.";
  const note = a.note ?? `${tenure}; ${remarkPart}`;
  return { id, name: NAMES[id], status, metric: opinionLabel, note };
}

function contingentLiabilities(ar: CompanyQualityV1["annual_report_checks"]): ForensicCheck {
  const id = "contingent_liabilities";
  const pct = ar.contingent_liabilities_pct_networth;
  if (pct == null) return notAssessed(id, "Needs the contingent-liabilities note from the annual report.");
  const t = FORENSIC_THRESHOLDS.contingentPct;
  const status = grade(pct, t.watch, t.flag);
  const note =
    status === "clean"
      ? "Off-balance-sheet claims are small against net worth."
      : status === "watch"
        ? "Off-balance-sheet claims are large enough to dent net worth if they crystallise."
        : "Off-balance-sheet claims could wipe out a large part of net worth.";
  return { id, name: NAMES[id], status, metric: `${formatPct(pct, 0)} of net worth`, note };
}

export function buildForensicChecks(payload: CompanyQualityV1): ForensicCheck[] {
  const years = payload.fiscal_years;
  const ar = payload.annual_report_checks;
  const financial = payload.statement_model === "financial";
  const financialNote = "Cash-flow and leverage ratios do not read the same way for a lender or broker.";
  return [
    financial ? notApplicable("profit_to_cash", financialNote) : profitToCash(years),
    financial ? notApplicable("receivable_days", financialNote) : receivableDays(years),
    financial ? notApplicable("debt_load", "Borrowings are the raw material of a lender, not a burden to service.") : debtLoad(years),
    relatedParty(ar),
    promoterPledge(ar),
    auditor(ar),
    contingentLiabilities(ar),
    otherIncome(years),
    equityDilution(years),
  ];
}

export function tallyChecks(checks: readonly ForensicCheck[]): ForensicTally {
  const tally: ForensicTally = { clean: 0, watch: 0, flag: 0, assessed: 0 };
  for (const c of checks) {
    if (c.status === "clean" || c.status === "watch" || c.status === "flag") {
      tally[c.status] += 1;
      tally.assessed += 1;
    }
  }
  return tally;
}
