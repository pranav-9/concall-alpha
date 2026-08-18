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

  return {
    companyCode: row.company_code,
    lensStatement: lensSelection?.statement ?? null,
    horizonLabel: lensSelection?.horizon_label ?? null,
    lenses,
    impliedCagrPct: toNumber(rdcf?.implied_cagr_pct),
    zone: rdcf?.zone_vs_phase5 ?? "unknown",
    zoneReading: rdcf?.reading ?? null,
    scenarios: {
      downside: toNumber(scenarios.downside),
      base: toNumber(scenarios.base),
      upside: toNumber(scenarios.upside),
    },
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
