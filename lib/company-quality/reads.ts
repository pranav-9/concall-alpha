import { cagrPct, formatPct, formatPlain, growthPhrase } from "./format";
import type {
  ForensicCheck,
  ForensicTally,
  QualityFiscalYear,
  QualityRead,
} from "./types";

/**
 * Templated "What happened" / "The read" copy, derived from the numbers alone.
 * No company-specific prose is invented: every sentence names a figure that is
 * on the card next to it. A producer may override these through
 * `payload.reads.*` (an LLM or hand-written read) — the templates are the floor.
 */

const pctWord = (v: number) => formatPct(v, 0);

const yoy = (curr: number | null | undefined, prev: number | null | undefined): number | null => {
  if (curr == null || prev == null || prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
};

/** Years where profit growth trailed revenue growth by a wide margin (or profit fell while revenue grew). */
export function laggingProfitYears(years: QualityFiscalYear[], gapPp = 15): string[] {
  const out: string[] = [];
  for (let i = 1; i < years.length; i++) {
    const r = yoy(years[i].revenue, years[i - 1].revenue);
    const p = yoy(years[i].net_profit, years[i - 1].net_profit);
    if (r == null) continue;
    if (p == null) {
      if ((years[i].net_profit ?? 0) < 0 && r > 0) out.push(years[i].label);
      continue;
    }
    if (r > 0 && p < r - gapPp) out.push(years[i].label);
  }
  return out;
}

export function financialsRead(years: QualityFiscalYear[]): QualityRead {
  const first = years[0];
  const latest = years[years.length - 1];
  const span = years.length - 1;
  const revCagr = cagrPct(first.revenue, latest.revenue, span);
  const patCagr = cagrPct(first.net_profit, latest.net_profit, span);
  const bullets: string[] = [];
  let headline: string;

  const lossNow = latest.net_profit != null && latest.net_profit < 0;
  if (years.length < 2) {
    headline = "One reported year; no trend to read yet.";
  } else if (lossNow) {
    headline =
      revCagr != null && revCagr > 0
        ? `Revenue grew ${pctWord(revCagr)} a year, but ${latest.label} closed in a loss.`
        : `${latest.label} closed in a loss.`;
  } else if (revCagr != null && patCagr != null) {
    if (patCagr >= revCagr + 5) {
      headline = `Profit grew faster than revenue: ${pctWord(patCagr)} vs ${pctWord(revCagr)} a year.`;
    } else if (patCagr <= revCagr - 5) {
      headline = `Revenue grew ${pctWord(revCagr)} a year; profit lagged at ${pctWord(patCagr)}.`;
    } else {
      headline = `Revenue and profit grew together, about ${pctWord(revCagr)} a year.`;
    }
  } else if (revCagr != null) {
    headline = `Revenue grew ${pctWord(revCagr)} a year; profit was not positive throughout.`;
  } else {
    headline = `Revenue ${growthPhrase(first.revenue, latest.revenue) ?? "moved"} over the window.`;
  }

  const revPhrase = growthPhrase(first.revenue, latest.revenue);
  if (revPhrase && first.revenue != null && latest.revenue != null) {
    bullets.push(
      `Revenue ${revPhrase} from ₹${formatPlain(first.revenue, 0)} cr in ${first.label} to ₹${formatPlain(latest.revenue, 0)} cr in ${latest.label}.`,
    );
  }
  const lagging = laggingProfitYears(years);
  if (lagging.length > 0) {
    const yr = lagging[lagging.length - 1];
    const i = years.findIndex((y) => y.label === yr);
    const r = yoy(years[i].revenue, years[i - 1].revenue);
    const p = yoy(years[i].net_profit, years[i - 1].net_profit);
    const turnedLoss = (years[i].net_profit ?? 0) < 0 && (years[i - 1].net_profit ?? 0) > 0;
    if (r != null && turnedLoss) {
      bullets.push(`${yr} was the weak year: revenue grew ${pctWord(r)} but the bottom line swung to a loss.`);
    } else if (r != null && p != null) {
      bullets.push(
        `${yr} was the weak year: profit ${p < 0 ? `fell ${pctWord(Math.abs(p))}` : `grew ${pctWord(p)}`} on ${pctWord(r)} more revenue.`,
      );
    } else if (r != null) {
      bullets.push(`${yr} was the weak year: revenue grew ${pctWord(r)} but the bottom line turned negative.`);
    }
  }
  if (first.net_margin_pct != null && latest.net_margin_pct != null && !lossNow) {
    const dir =
      latest.net_margin_pct > first.net_margin_pct + 0.5
        ? "widened"
        : latest.net_margin_pct < first.net_margin_pct - 0.5
          ? "narrowed"
          : "held";
    bullets.push(
      `Net margin ${dir}: ${formatPct(first.net_margin_pct)} in ${first.label} to ${formatPct(latest.net_margin_pct)} in ${latest.label}.`,
    );
  }
  if (bullets.length < 2 && latest.net_profit != null) {
    bullets.push(`Net profit in ${latest.label}: ₹${formatPlain(latest.net_profit, 0)} cr.`);
  }
  return { headline, bullets: bullets.slice(0, 4) };
}

export function returnsRead(years: QualityFiscalYear[], financial: boolean): QualityRead {
  const first = years[0];
  const latest = years[years.length - 1];
  const bullets: string[] = [];
  let headline: string;

  const roceFirst = first.roce_pct;
  const roceLast = latest.roce_pct;
  const roeLast = latest.roe_pct;
  const primaryLabel = financial ? "ROE" : "ROCE";
  const pFirst = financial ? first.roe_pct : roceFirst;
  const pLast = financial ? roeLast : roceLast;

  if (years.length < 2 || pFirst == null || pLast == null) {
    headline = pLast != null ? `${primaryLabel} of ${formatPct(pLast, 0)} in ${latest.label}.` : "Return ratios not available.";
  } else if (pLast >= pFirst + 3) {
    headline = `Returns improved: ${primaryLabel} ${formatPct(pLast, 0)}, from ${formatPct(pFirst, 0)} in ${first.label}.`;
  } else if (pLast < 0) {
    headline = `Returns turned negative: ${primaryLabel} ${formatPct(pLast, 0)}, from ${formatPct(pFirst, 0)} in ${first.label}.`;
  } else if (pLast <= pFirst - 3) {
    headline = `Returns slipped: ${primaryLabel} ${formatPct(pLast, 0)}, from ${formatPct(pFirst, 0)} in ${first.label}.`;
  } else {
    headline = `Returns held around ${formatPct(pLast, 0)} ${primaryLabel} through the window.`;
  }

  const gross = years.map((y) => y.gross_margin_pct).filter((v): v is number => v != null);
  if (!financial && gross.length >= 3) {
    const min = Math.min(...gross);
    const max = Math.max(...gross);
    const band = max - min;
    bullets.push(
      band <= 4
        ? `Gross margin stayed in a ${formatPlain(min, 0)}–${formatPlain(max, 0)}% band: pricing is steady.`
        : `Gross margin ranged ${formatPlain(min, 0)}–${formatPlain(max, 0)}%: input costs or mix move the margin.`,
    );
  }
  // The dip year on the primary return ratio, if any.
  const series = years.map((y) => (financial ? y.roe_pct : y.roce_pct));
  let dipIdx = -1;
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1];
    const b = series[i];
    if (a != null && b != null && b <= a - 3 && (dipIdx === -1 || b < (series[dipIdx] ?? Infinity))) dipIdx = i;
  }
  if (dipIdx > 0) {
    const after = series.slice(dipIdx + 1).filter((v): v is number => v != null);
    const recovered = after.length > 0 && after[after.length - 1] >= (series[dipIdx] ?? 0) + 2;
    bullets.push(
      `${primaryLabel} dipped to ${formatPct(series[dipIdx], 0)} in ${years[dipIdx].label}${recovered ? `, then recovered to ${formatPct(after[after.length - 1], 0)}` : ""}.`,
    );
  }
  if (latest.net_margin_pct != null && pLast != null) {
    if (pLast < 0 || latest.net_margin_pct < 0) {
      bullets.push(`Negative returns in ${latest.label}: ${primaryLabel} ${formatPct(pLast, 0)} on a ${formatPct(latest.net_margin_pct, 0)} net margin.`);
    } else {
      const level = pLast >= 25 ? "High" : pLast >= 15 ? "Mid-teens-plus" : pLast >= 10 ? "Low-double-digit" : "Single-digit";
      bullets.push(`${level} returns on a ${formatPct(latest.net_margin_pct, 0)} net margin in ${latest.label}.`);
    }
  }
  if (bullets.length < 2 && roeLast != null) {
    bullets.push(`ROE ${formatPct(roeLast, 0)} in ${latest.label} (derived from average net worth).`);
  }
  return { headline, bullets: bullets.slice(0, 4) };
}

export function forensicRead(checks: ForensicCheck[], tally: ForensicTally): { headline: string; body: string } {
  const flags = checks.filter((c) => c.status === "flag");
  const watches = checks.filter((c) => c.status === "watch");
  const unassessed = checks.filter((c) => c.status === "not_assessed");
  const names = (xs: ForensicCheck[]) => xs.map((c) => c.name.toLowerCase()).join(", ");

  let headline: string;
  if (tally.assessed === 0) {
    headline = "Nothing assessed yet.";
  } else if (flags.length > 0) {
    headline = `${flags.length === 1 ? "One flag" : `${flags.length} flags`} to answer: ${names(flags)}.`;
  } else if (watches.length > 0) {
    headline = `No flags; the open question${watches.length === 1 ? " is" : "s are"} ${names(watches)}.`;
  } else {
    headline = `Clean on every check we can run from the statements.`;
  }

  const parts: string[] = [];
  for (const c of [...flags, ...watches]) {
    parts.push(`${c.name}: ${c.metric.toLowerCase().startsWith(c.name.toLowerCase()) ? c.metric : `${c.metric}.`} ${c.note}`);
  }
  if (parts.length === 0 && tally.assessed > 0) {
    parts.push(`${tally.clean} of ${tally.assessed} statement checks clean; nothing in the numbers asks for a closer look.`);
  }
  if (unassessed.length > 0) {
    parts.push(
      `${unassessed.length} check${unassessed.length === 1 ? "" : "s"} (${names(unassessed)}) need the annual report and are not assessed yet.`,
    );
  }
  return { headline, body: parts.join(" ") };
}
