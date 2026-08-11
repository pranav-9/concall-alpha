import { createClient } from "@/lib/supabase/server";
import { buildNewCompanySet } from "@/lib/company-freshness";
import {
  COVERAGE_SELECT,
  isAdmittedLargeCap,
  isBelowCoverageCut,
} from "@/lib/coverage-policy";
import {
  isScoredWithin24h,
  normalizeSourceStatus,
  scoreWrittenAt,
} from "@/lib/score-freshness";
import { classifyTrajectory, quarterIndex } from "@/lib/score-trajectory";
import { mean4Q, meanLatestScored } from "@/lib/quarter-composite";
import { assessStaleness } from "@/lib/valuation-check/normalize";
import type { ValuationVerdict } from "@/lib/valuation-check/types";
import type { CompanyRow } from "./leaderboard-table";
import type { QuarterData } from "./types";

type QuarterInfo = {
  fy: number;
  qtr: number;
  label: string;
};

// The leaderboard maths only reads these fields. A bare .select() also drags
// down the `details` JSONB for every row — ~4 MB per request instead of ~70 KB.
// source_status is pulled as a scalar JSON path for the same reason: the whole
// point is to read one string out of scoring_meta without shipping the blob.
const SCORE_COLUMNS =
  "company_code, fy, qtr, quarter_label, score, updated_at, created_at, " +
  "source_status:details->scoring_meta->>source_status, " +
  "scored_at:details->scoring_meta->>scored_at";

// PostgREST silently caps an unpaginated select at 1000 rows, so page through it.
// concall_analysis passes 841 rows through the scoring_meta filter today and grows
// ~one row per company per quarter — without this it would start dropping quarters.
const PAGE_SIZE = 1000;

type ScoreRow = Pick<
  QuarterData,
  "company_code" | "fy" | "qtr" | "quarter_label" | "score"
> & {
  updated_at?: string | null;
  created_at?: string | null;
  /** details.scoring_meta.source_status — "unofficial" or absent. */
  source_status?: string | null;
  /** details.scoring_meta.scored_at — when THIS score was computed. */
  scored_at?: string | null;
};

async function fetchScoreRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ScoreRow[]> {
  const rows: ScoreRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("concall_analysis")
      // legacy-logic scores (no details.scoring_meta) are hidden portal-wide
      .select(SCORE_COLUMNS)
      .not("details->scoring_meta", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as unknown as ScoreRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export const getConcallData = async ({
  excludeLargeCaps = false,
  includeBelowCut = false,
}: {
  excludeLargeCaps?: boolean;
  /**
   * Keep companies below the composite cut in the result, flagged `belowCut`,
   * instead of dropping them. The leaderboard renders them as a greyed,
   * non-clickable tail below the ranked hundred; every other discovery surface
   * still wants them gone. Only meaningful alongside excludeLargeCaps — large
   * caps are never part of the tail (see lib/coverage-policy).
   */
  includeBelowCut?: boolean;
} = {}) => {
  const supabase = await createClient();
  const [scoreRows, { data: companyRows }, { data: valuationRows }] = await Promise.all([
    fetchScoreRows(supabase),
    supabase.from("company").select(`code, created_at, ${COVERAGE_SELECT}`),
    // Only published rows: the section opens per company, and an unpublished read must not
    // reach a discovery surface ahead of the company page it belongs to.
    supabase
      .from("valuation_check")
      .select("company_code, verdict, score, rateable, priced_as_of, price_at_run")
      .eq("valuation_published", true),
  ]);

  // A leaderboard cell cannot show its own staleness caveat, so a stale read is dropped
  // rather than displayed: the company page is where a withheld verdict gets explained.
  const valuationByCompany = new Map<string, { verdict: ValuationVerdict; score: number | null }>();
  for (const row of (valuationRows ?? []) as Array<{
    company_code: string;
    verdict: string | null;
    score: number | null;
    rateable: boolean | null;
    priced_as_of: string | null;
    price_at_run: number | null;
  }>) {
    if (!row.rateable || row.verdict == null) continue;
    const { stale } = assessStaleness({
      pricedAsOf: row.priced_as_of,
      priceAtRun: row.price_at_run,
    });
    if (stale) continue;
    valuationByCompany.set(row.company_code.toUpperCase(), {
      verdict: row.verdict as ValuationVerdict,
      score: row.score,
    });
  }
  const companyRowList = (companyRows ?? []) as Array<{
    code: string;
    created_at?: string | null;
    market_cap_band_at_admission?: string | null;
    excluded_from_discovery?: boolean | null;
  }>;
  const newCompanySet = buildNewCompanySet(companyRowList);

  // Coverage policy: on discovery surfaces, drop companies admitted as large
  // cap. Off by default so user-owned surfaces (watchlists) keep every holding.
  // The two gates are handled separately here — with includeBelowCut, only the
  // admission gate removes rows; the cut gate just marks them.
  const excludedCodes = new Set<string>();
  const belowCutCodes = new Set<string>();
  if (excludeLargeCaps) {
    companyRowList.forEach((row) => {
      const code = row.code.toUpperCase();
      if (isAdmittedLargeCap(row)) {
        excludedCodes.add(code);
        return;
      }
      if (isBelowCoverageCut(row)) {
        if (includeBelowCut) belowCutCodes.add(code);
        else excludedCodes.add(code);
      }
    });
  }

  const records = scoreRows.filter(
    (r) => excludedCodes.size === 0 || !excludedCodes.has(String(r.company_code).toUpperCase()),
  );

  // sort newest -> oldest
  const sorted = [...records].sort(
    (a, b) => b.fy - a.fy || b.qtr - a.qtr
  );

  // pick latest 4 unique quarters
  const quarters: QuarterInfo[] = [];
  sorted.forEach((row) => {
    const id = `${row.fy}-${row.qtr}`;
    if (quarters.some((q) => `${q.fy}-${q.qtr}` === id)) return;
    quarters.push({
      fy: row.fy,
      qtr: row.qtr,
      label: row.quarter_label ?? `Q${row.qtr} FY${row.fy}`,
    });
  });
  const selectedQuarters = quarters.slice(0, 4);

  const recordsByCompany = new Map<string, ScoreRow[]>();
  for (const row of sorted) {
    const bucket = recordsByCompany.get(row.company_code);
    if (bucket) {
      bucket.push(row);
    } else {
      recordsByCompany.set(row.company_code, [row]);
    }
  }

  // One clock for the whole render, so two rows can't straddle the 24h edge.
  const renderedAt = new Date();
  const boardLatest = selectedQuarters[0];

  const rows: CompanyRow[] = Array.from(recordsByCompany.entries()).map(
    ([companyCode, companyRecords]) => {
      const valuation = valuationByCompany.get(companyCode.toUpperCase());
      const row: CompanyRow = {
        company: companyCode,
        isNew: newCompanySet.has(companyCode.toUpperCase()),
        belowCut: belowCutCodes.has(companyCode.toUpperCase()),
        valuationVerdict: valuation?.verdict ?? null,
        valuationScore: valuation?.score ?? null,
      };
      // Company's own newest scored quarter — lets the Band column fall back
      // to the latest available band (with an "as of" label) when the company
      // hasn't reported the leaderboard's latest quarter yet.
      const ownLatest = companyRecords[0];
      row.ownLatestScore = ownLatest?.score ?? null;
      row.ownLatestQuarterLabel = ownLatest
        ? (ownLatest.quarter_label ?? `Q${ownLatest.qtr} FY${ownLatest.fy}`)
        : null;

      const recordsByQuarter = new Map(
        companyRecords.map((record) => [`${record.fy}-${record.qtr}`, record] as const),
      );

      // companyRecords is newest-first; mean4Q / meanLatestScored filter nulls
      // then take the newest N, matching compute_composite_score.py's window
      // (see lib/quarter-composite). This is the standing quarter leg the board's
      // Quarter column and Read now use — NOT the single latest print.
      const scoresNewestFirst = companyRecords.map((r) => r.score);
      row["Latest 4Q Avg"] = mean4Q(scoresNewestFirst);
      row["Latest 12Q Avg"] = meanLatestScored(scoresNewestFirst, 12);

      selectedQuarters.forEach((q) => {
        const match = recordsByQuarter.get(`${q.fy}-${q.qtr}`);
        row[q.label] = match?.score ?? null;
      });

      // Provenance and recency describe the score the Latest cell actually
      // renders — which is the board's newest quarter, or this company's own
      // newest when it hasn't reported yet (the same fallback the cell uses).
      const shownRecord = boardLatest
        ? recordsByQuarter.get(`${boardLatest.fy}-${boardLatest.qtr}`) ?? ownLatest
        : ownLatest;
      row.latestSourceStatus = normalizeSourceStatus(shownRecord?.source_status);
      row.latestScoredAt = shownRecord ? scoreWrittenAt(shownRecord) : null;
      row.scoredWithin24h = isScoredWithin24h(row.latestScoredAt, renderedAt);

      // Trajectory classification (lib/score-trajectory owns all thresholds).
      // Gap detection over the 4-record window: a missing quarter (fy/qtr not
      // contiguous — FY rollover Q4→Q1 IS contiguous) or a null score inside
      // the window withholds event labels (climbing / inflecting up / cracking).
      const gapWindow = companyRecords.slice(0, 4);
      let hasGapInWindow = gapWindow.some(
        (r) => typeof r.score !== "number" || !Number.isFinite(r.score),
      );
      for (let i = 0; i < gapWindow.length - 1; i++) {
        if (
          quarterIndex(gapWindow[i].fy, gapWindow[i].qtr) -
            quarterIndex(gapWindow[i + 1].fy, gapWindow[i + 1].qtr) !==
          1
        ) {
          hasGapInWindow = true;
        }
      }
      const trajectoryScores = companyRecords
        .map((r) => r.score)
        .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
      const trajectory = classifyTrajectory(trajectoryScores, { hasGapInWindow });
      row.trajectoryKey = trajectory.key;
      row.trendChange = trajectory.change;
      row.trendDescription = trajectory.description;

      return row;
    },
  );

  const latestLabel = selectedQuarters[0]?.label;
  // Descending by latest-quarter score; a real 0 is a score, null is not —
  // unscored rows sort last.
  const sortedRows = latestLabel
    ? rows.sort((a, b) => {
        const av = a[latestLabel];
        const bv = b[latestLabel];
        const an = typeof av === "number" && Number.isFinite(av) ? av : null;
        const bn = typeof bv === "number" && Number.isFinite(bv) ? bv : null;
        // Ties (equal scores, or two companies that haven't reported the latest
        // quarter) break on company code. Without this the tail order fell out of
        // whatever physical order Postgres returned, so it reshuffled after writes.
        if (an == null && bn == null) return a.company.localeCompare(b.company);
        if (an == null) return 1;
        if (bn == null) return -1;
        if (bn !== an) return bn - an;
        return a.company.localeCompare(b.company);
      })
    : rows;

  return {
    rows: sortedRows,
    quarterLabels: selectedQuarters.map((q) => q.label),
    latestLabel,
    previousLabel: selectedQuarters[1]?.label,
  };
};
