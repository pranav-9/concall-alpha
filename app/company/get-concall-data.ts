import { createClient } from "@/lib/supabase/server";
import { buildNewCompanySet } from "@/lib/company-freshness";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import { classifyTrajectory, quarterIndex } from "@/lib/score-trajectory";
import type { CompanyRow } from "./leaderboard-table";
import type { QuarterData } from "./types";

type QuarterInfo = {
  fy: number;
  qtr: number;
  label: string;
};

// The leaderboard maths only reads these five fields. A bare .select() also drags
// down the `details` JSONB for every row — ~4 MB per request instead of ~70 KB.
const SCORE_COLUMNS = "company_code, fy, qtr, quarter_label, score";

// PostgREST silently caps an unpaginated select at 1000 rows, so page through it.
// concall_analysis passes 841 rows through the scoring_meta filter today and grows
// ~one row per company per quarter — without this it would start dropping quarters.
const PAGE_SIZE = 1000;

type ScoreRow = Pick<
  QuarterData,
  "company_code" | "fy" | "qtr" | "quarter_label" | "score"
>;

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

// Average over scored records only — a null score must not count as 0.
const avgScore = (records: ScoreRow[]): number | null => {
  const scores = records
    .map((r) => r.score)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  return scores.length > 0
    ? scores.reduce((acc, s) => acc + s, 0) / scores.length
    : null;
};

export const getConcallData = async ({
  excludeLargeCaps = false,
}: { excludeLargeCaps?: boolean } = {}) => {
  const supabase = await createClient();
  const [scoreRows, { data: companyRows }] = await Promise.all([
    fetchScoreRows(supabase),
    supabase.from("company").select(`code, created_at, ${COVERAGE_SELECT}`),
  ]);
  const companyRowList = (companyRows ?? []) as Array<{
    code: string;
    created_at?: string | null;
    market_cap_band_at_admission?: string | null;
    excluded_from_discovery?: boolean | null;
  }>;
  const newCompanySet = buildNewCompanySet(companyRowList);

  // Coverage policy: on discovery surfaces, drop companies admitted as large
  // cap. Off by default so user-owned surfaces (watchlists) keep every holding.
  const excludedCodes = new Set<string>();
  if (excludeLargeCaps) {
    companyRowList.forEach((row) => {
      if (!isDiscoveryListed(row)) {
        excludedCodes.add(row.code.toUpperCase());
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

  const rows: CompanyRow[] = Array.from(recordsByCompany.entries()).map(
    ([companyCode, companyRecords]) => {
      const row: CompanyRow = {
        company: companyCode,
        isNew: newCompanySet.has(companyCode.toUpperCase()),
      };
      // Company's own newest scored quarter — lets the Band column fall back
      // to the latest available band (with an "as of" label) when the company
      // hasn't reported the leaderboard's latest quarter yet.
      const ownLatest = companyRecords[0];
      row.ownLatestScore = ownLatest?.score ?? null;
      row.ownLatestQuarterLabel = ownLatest
        ? (ownLatest.quarter_label ?? `Q${ownLatest.qtr} FY${ownLatest.fy}`)
        : null;

      const latest4 = companyRecords.slice(0, 4);
      const latest12 = companyRecords.slice(0, 12);
      const recordsByQuarter = new Map(
        companyRecords.map((record) => [`${record.fy}-${record.qtr}`, record] as const),
      );

      row["Latest 4Q Avg"] = avgScore(latest4);
      row["Latest 12Q Avg"] = avgScore(latest12);

      selectedQuarters.forEach((q) => {
        const match = recordsByQuarter.get(`${q.fy}-${q.qtr}`);
        row[q.label] = match?.score ?? null;
      });

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
