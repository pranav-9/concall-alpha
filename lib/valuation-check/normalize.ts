import type {
  NormalizedValuationCheck,
  NormalizedValuationLens,
  ValuationCheckRow,
  ValuationLensId,
  ValuationLensRow,
} from "./types";

export const VALUATION_LENS_LABEL: Record<ValuationLensId, string> = {
  pe: "P/E",
  pbv: "P/B",
  ev_ebitda: "EV/EBITDA",
  mcap_sales: "MCap/Sales",
};

/**
 * How stale a price may be before the verdict is withheld.
 *
 * This is the only section on the platform that decays daily — every other one is quarterly.
 * A verdict shown against a price that has since moved is worse than no verdict, so both a
 * time bound and a move bound apply.
 */
export const VALUATION_STALE_AFTER_DAYS = 4;
export const VALUATION_STALE_AFTER_MOVE_PCT = 10;

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// Display labels + ordering weight for the delivered-CAGR markers on the horizon bar. Unknown
// keys still render (label falls back to "<key> delivered") but sort last.
const DELIVERED_CAGR_META: Record<string, { label: string; order: number }> = {
  "10y": { label: "10-yr delivered", order: 0 },
  "5y": { label: "5-yr delivered", order: 1 },
  "3y": { label: "3-yr delivered", order: 2 },
  "1y": { label: "TTM", order: 3 },
  ttm: { label: "TTM", order: 3 },
};

const normalizeDeliveredCagr = (
  raw: Record<string, number | null> | null | undefined,
): { key: string; label: string; pct: number }[] => {
  if (!raw) return [];
  return Object.entries(raw)
    .map(([key, value]) => {
      const pct = toNumber(value);
      if (pct === null) return null;
      const meta = DELIVERED_CAGR_META[key];
      return {
        key,
        label: meta?.label ?? `${key} delivered`,
        pct,
        order: meta?.order ?? 99,
      };
    })
    .filter((m): m is { key: string; label: string; pct: number; order: number } => m !== null)
    .sort((a, b) => a.order - b.order)
    .map(({ key, label, pct }) => ({ key, label, pct }));
};

const normalizeLens = (
  id: ValuationLensId,
  row: ValuationLensRow | undefined,
  role: "primary" | "cross-check",
): NormalizedValuationLens | null => {
  if (!row) return null;
  return {
    id,
    label: VALUATION_LENS_LABEL[id],
    role,
    current: toNumber(row.current),
    band: row.band_5y ?? null,
    pill: row.pill ?? null,
    pillBasis: row.pill_basis ?? null,
    interpretation: row.interpretation ?? null,
    shortHistory: Boolean(row.short_history),
    lowInformationBand: Boolean(row.low_information_band),
    // Kept when Screener serves no history series but the ratios block still has the level:
    // showing the number without a pill beats showing nothing.
    levelWithoutBand: row.available ? null : toNumber(row.current_from_ratios),
  };
};

export function normalizeValuationCheck(
  row: ValuationCheckRow | null,
): NormalizedValuationCheck | null {
  if (!row) return null;

  const lensSelection = row.lens_selection ?? null;
  const relative = row.relative_valuation ?? {};
  const primaryId = (lensSelection?.primary ?? row.primary_lens) as ValuationLensId | null;
  const crossId = (lensSelection?.cross_check ?? null) as ValuationLensId | null;

  const lenses = [
    primaryId ? normalizeLens(primaryId, relative[primaryId], "primary") : null,
    crossId && crossId !== primaryId
      ? normalizeLens(crossId, relative[crossId], "cross-check")
      : null,
  ].filter((lens): lens is NormalizedValuationLens => Boolean(lens));

  const rdcf = row.reverse_dcf ?? null;
  const scenarios = rdcf?.phase5_scenarios ?? {};
  const verdictBlock = row.verdict_block ?? null;

  // PEG lenses, derived purely for display (never an input to the score). Read the P/E level
  // from relative.pe directly, not from `lenses` — pe may exist even when it isn't the
  // primary/cross-check lens. Both legs divide the same P/E; each is independently gated.
  //   - trailing: 5-yr EPS CAGR (fraction; already null unless earnings ran positive-to-
  //     positive, so a present value is genuine positive growth). Textbook PEG.
  //   - forward: Phase 5 base case, which is a REVENUE CAGR — directional, not a real PEG.
  const epsSummary = ((row.market_data ?? {}) as Record<string, unknown>).eps_summary as
    | { cagr_5y?: number | null; has_loss_year?: boolean }
    | null
    | undefined;
  const pegPe = toNumber(relative.pe?.current);
  const epsCagr = toNumber(epsSummary?.cagr_5y);
  const baseCagr = toNumber(scenarios.base);
  const trailing =
    pegPe !== null && pegPe > 0 && epsCagr !== null && epsCagr > 0
      ? {
          ratio: pegPe / (epsCagr * 100),
          growthPct: epsCagr * 100,
          hasLossYear: Boolean(epsSummary?.has_loss_year),
        }
      : null;
  const forward =
    pegPe !== null && pegPe > 0 && baseCagr !== null && baseCagr > 0
      ? { ratio: pegPe / (baseCagr * 100), growthPct: baseCagr * 100 }
      : null;
  const peg =
    pegPe !== null && pegPe > 0 && (trailing || forward)
      ? { pe: pegPe, trailing, forward }
      : null;

  return {
    companyCode: row.company_code,
    lensStatement: lensSelection?.statement ?? null,
    horizonLabel: lensSelection?.horizon_label ?? null,
    lenses,
    impliedCagrPct: toNumber(rdcf?.implied_cagr_pct),
    zone: rdcf?.zone_vs_phase5 ?? "unknown",
    zoneReading: rdcf?.reading ?? null,
    // Phase E: a financial priced on the reverse residual-income model. zone_basis is the
    // discriminator every downstream reader keys on; the implied/delivered figures are RoE, not
    // growth, so the block relabels and the horizon axis compares implied vs delivered RoE.
    isResidualIncome: rdcf?.zone_basis === "delivered_roe",
    impliedRoePct: toNumber(rdcf?.residual_income?.implied_roe_pct),
    deliveredRoePct: toNumber(rdcf?.residual_income?.delivered_roe_pct),
    scenarios: {
      downside: toNumber(scenarios.downside),
      base: toNumber(scenarios.base),
      upside: toNumber(scenarios.upside),
    },
    deliveredCagr: normalizeDeliveredCagr(rdcf?.delivered_cagr),
    plausibilityCheck: rdcf?.plausibility_check ?? null,
    // v14 §9.3 rules a cash-flow DCF out for lenders, insurers and asset managers; the block
    // is returned not-applicable rather than run anyway.
    reverseDcfApplicable: rdcf?.solve_status !== "not applicable",
    reverseDcfNote: rdcf?.solve_status === "not applicable" ? (rdcf?.reading ?? null) : null,
    overlayRows: row.overlay?.rows ?? [],
    overlayInterpretation: row.overlay?.interpretation ?? null,
    forensicsAvailable: Boolean(row.overlay?.forensics_available),
    verdict: verdictBlock?.verdict ?? row.verdict ?? null,
    score: verdictBlock?.score ?? row.score ?? null,
    reasoning: verdictBlock?.reasoning ?? null,
    whatWouldChangeTheCall: verdictBlock?.what_would_change_the_call ?? [],
    derivation: verdictBlock?.derivation ?? [],
    capsApplied: verdictBlock?.caps_applied ?? [],
    rateable: Boolean(row.rateable),
    unratedReasons: row.unrated_reasons ?? [],
    incompleteReasons: row.incomplete_reasons ?? [],
    caveats: row.caveats ?? [],
    pricedAsOf: row.priced_as_of ?? null,
    priceAtRun: toNumber(row.price_at_run),
    peg,
    peerContext: row.peers
      ? {
          medianPe: toNumber(row.peers.industry_median_pe),
          industryN: toNumber(row.peers.industry_n),
          qualityContextNote: row.peers.quality_context_note ?? null,
        }
      : null,
  };
}

export type ValuationStaleness = {
  stale: boolean;
  reason: string | null;
  ageDays: number | null;
};

/**
 * Whether the verdict should be withheld. `livePrice` is optional — without it only the age
 * bound applies, which is the conservative direction.
 */
export function assessStaleness(
  valuation: Pick<NormalizedValuationCheck, "pricedAsOf" | "priceAtRun">,
  now: Date = new Date(),
  livePrice?: number | null,
): ValuationStaleness {
  if (!valuation.pricedAsOf) {
    return { stale: true, reason: "no pricing date on this read", ageDays: null };
  }
  const priced = new Date(`${valuation.pricedAsOf}T00:00:00Z`);
  if (Number.isNaN(priced.getTime())) {
    return { stale: true, reason: "unreadable pricing date", ageDays: null };
  }
  const ageDays = Math.floor((now.getTime() - priced.getTime()) / 86_400_000);

  if (ageDays > VALUATION_STALE_AFTER_DAYS) {
    return {
      stale: true,
      reason: `priced ${ageDays} days ago; a valuation read older than ${VALUATION_STALE_AFTER_DAYS} days is not shown as a verdict`,
      ageDays,
    };
  }
  if (livePrice && valuation.priceAtRun) {
    const movePct = Math.abs((livePrice - valuation.priceAtRun) / valuation.priceAtRun) * 100;
    if (movePct > VALUATION_STALE_AFTER_MOVE_PCT) {
      return {
        stale: true,
        reason: `price has moved ${movePct.toFixed(0)}% since this read`,
        ageDays,
      };
    }
  }
  return { stale: false, reason: null, ageDays };
}
