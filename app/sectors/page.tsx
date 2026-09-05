import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { slugifySector } from "@/app/sector/utils";
import { getConcallData } from "@/app/company/get-concall-data";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import {
  BOARD_READS,
  classifyBoardRead,
  type BoardReadKey,
} from "@/lib/board-read";
import { bandForScore, BANDS } from "@/lib/score-band";
import { bandForGrowthScore, GROWTH_BANDS } from "@/lib/growth-band";
import {
  bandForValuationScore,
  toValuationScale,
  VALUATION_BANDS,
} from "@/lib/valuation-band";
import {
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_NEUTRAL,
  TABLE_CARD_SKY,
  TABLE_SCROLL_HINT,
} from "@/lib/design/shell";

type CompanyRow = {
  code: string;
  name: string | null;
  sector: string | null;
  sub_sector: string | null;
  market_cap_band_at_admission?: string | null;
  excluded_from_discovery?: boolean | null;
};

type GrowthOutlookRow = {
  company: string;
  growth_score?: string | number | null;
  run_timestamp?: string | null;
};

type SectorRow = {
  sector: string;
  slug: string;
  companyCount: number;
  subSectorCount: number;
  reportedCount: number;
  avgLatest: number | null;
  avg4Q: number | null;
  avgGrowth: number | null;
  avgValuation: number | null;
  valuationCount: number;
  // The leaderboard's Read: composite number + configuration word.
  readScore: number | null;
  readKey: BoardReadKey;
  readLabel: string;
  rank: number | null;
};

// Read is the canonical order; the rest let a reader re-sort a single leg.
type SectorSortKey =
  | "read"
  | "sector"
  | "companies"
  | "latest_qtr"
  | "avg_4q"
  | "growth"
  | "valuation";

const defaultDirectionForKey = (key: SectorSortKey): "asc" | "desc" =>
  key === "sector" ? "asc" : "desc";

export const metadata: Metadata = {
  title: "Sectors – Story of a Stock",
  description:
    "Every sector on the same scores as the leaderboard — the quarter, the trailing four, the outlook, and what you pay for it — folded into one Read.",
  alternates: { canonical: "/sectors" },
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const avg = (values: number[]): number | null =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

const PAGE_BACKGROUND_CLASS = `h-[30rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

// ── Band-cell helpers ──────────────────────────────────────────────────────
// Each numeric leg renders as a number over its band word, in the app's shared
// band grammar (score-band / growth-band / valuation-band), so a sector reads on
// exactly the same vocabulary as a company row on the leaderboard.

function quarterBand(score: number) {
  const def = BANDS[bandForScore(score)];
  return { label: def.label, textClass: def.textClass };
}
function growthBand(score: number) {
  const def = GROWTH_BANDS[bandForGrowthScore(score)];
  return { label: def.label, textClass: def.textClass };
}
function valuationBand(score: number) {
  const def = VALUATION_BANDS[bandForValuationScore(score)];
  return { label: def.label, textClass: def.textClass };
}

// One leg on the phone row's single legs line: muted label, number in its band
// colour. Same figure as the desktop column, minus the band word.
function LegStat({
  label,
  score,
  band,
}: {
  label: string;
  score: number | null;
  band: (s: number) => { label: string; textClass: string };
}) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>
      {score == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className={`font-semibold tabular-nums ${band(score).textClass}`}>
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
}

function ScoreCell({
  score,
  band,
  className = "",
}: {
  score: number | null;
  band: ((s: number) => { label: string; textClass: string }) | null;
  className?: string;
}) {
  if (score == null) {
    return (
      <td className={`px-4 py-3 text-right align-middle ${className}`}>
        <span className="text-muted-foreground">—</span>
      </td>
    );
  }
  const b = band ? band(score) : null;
  return (
    <td className={`px-4 py-3 text-right align-middle ${className}`}>
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[15px] font-semibold tabular-nums text-foreground">
          {score.toFixed(1)}
        </span>
        {b ? (
          <span className={`text-[11px] font-medium ${b.textClass}`}>{b.label}</span>
        ) : null}
      </div>
    </td>
  );
}

export default async function SectorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: SectorSortKey; order?: "asc" | "desc" }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sortKeys: SectorSortKey[] = [
    "read",
    "sector",
    "companies",
    "latest_qtr",
    "avg_4q",
    "growth",
    "valuation",
  ];
  const sortBy: SectorSortKey = sortKeys.includes(
    resolvedSearchParams?.sort as SectorSortKey,
  )
    ? (resolvedSearchParams!.sort as SectorSortKey)
    : "read";
  const sortOrder: "asc" | "desc" =
    resolvedSearchParams?.order === "asc" || resolvedSearchParams?.order === "desc"
      ? resolvedSearchParams.order
      : defaultDirectionForKey(sortBy);
  const supabase = await createClient();

  const [
    { data: companiesData },
    { rows: concallRows, latestLabel },
    { data: growthRowsData },
  ] = await Promise.all([
    supabase
      .from("company")
      .select(`code, name, sector, sub_sector, ${COVERAGE_SELECT}`)
      .not("sector", "is", null),
    getConcallData({ excludeLargeCaps: true }),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, run_timestamp")
      .order("run_timestamp", { ascending: false }),
  ]);

  const companies = ((companiesData ?? []) as CompanyRow[]).filter((company) =>
    isDiscoveryListed(company),
  );
  if (!companies.length) {
    return (
      <main className="relative isolate overflow-hidden">
        <div className={PAGE_BACKGROUND_CLASS} />
        <div className={PAGE_SHELL}>
          <div className={PANEL_CARD_NEUTRAL}>
            <p className="text-sm text-muted-foreground">No sector data available yet.</p>
          </div>
        </div>
      </main>
    );
  }

  // Per-company legs, all on the 0-10 scale. The quarter LEG that feeds the Read
  // is the recency-weighted 4Q blend ("Latest 4Q Blend") — the leaderboard's own
  // quarter leg — while the two displayed quarter columns keep the single latest
  // print and the flat 4Q mean for transparency. Valuation is the published,
  // non-stale, rateable read getConcallData already gated, rescaled 0-100 -> 0-10.
  const legByCode = new Map<
    string,
    {
      latest: number | null;
      avg4Q: number | null;
      blend: number | null;
      valuation: number | null;
    }
  >();
  concallRows.forEach((row) => {
    legByCode.set(row.company.toUpperCase(), {
      latest: latestLabel ? toNumberOrNull(row[latestLabel]) : null,
      avg4Q: toNumberOrNull(row["Latest 4Q Avg"]),
      blend: toNumberOrNull(row["Latest 4Q Blend"]),
      valuation: toValuationScale(toNumberOrNull(row.valuationScore)),
    });
  });

  const latestGrowthByKey = new Map<string, number | null>();
  ((growthRowsData ?? []) as GrowthOutlookRow[]).forEach((row) => {
    const key = row.company?.trim().toUpperCase();
    if (!key || latestGrowthByKey.has(key)) return;
    latestGrowthByKey.set(key, toNumberOrNull(row.growth_score));
  });

  const sectorMap = new Map<
    string,
    {
      companyCount: number;
      subSectors: Set<string>;
      latest: number[];
      avg4Q: number[];
      blend: number[];
      growth: number[];
      valuation: number[];
    }
  >();

  companies.forEach((company) => {
    const sector = company.sector?.trim();
    if (!sector) return;

    const codeKey = company.code.toUpperCase();
    const nameKey = (company.name ?? "").trim().toUpperCase();
    const leg = legByCode.get(codeKey);
    const growth =
      latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? null;

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, {
        companyCount: 0,
        subSectors: new Set<string>(),
        latest: [],
        avg4Q: [],
        blend: [],
        growth: [],
        valuation: [],
      });
    }
    const bucket = sectorMap.get(sector)!;
    bucket.companyCount += 1;
    if (company.sub_sector?.trim()) bucket.subSectors.add(company.sub_sector.trim());
    if (leg?.latest != null) bucket.latest.push(leg.latest);
    if (leg?.avg4Q != null) bucket.avg4Q.push(leg.avg4Q);
    if (leg?.blend != null) bucket.blend.push(leg.blend);
    if (growth != null) bucket.growth.push(growth);
    if (leg?.valuation != null) bucket.valuation.push(leg.valuation);
  });

  const unranked: Omit<SectorRow, "rank">[] = Array.from(sectorMap.entries())
    .filter(([, bucket]) => bucket.companyCount > 1)
    .map(([sector, bucket]) => {
      const avgBlend = avg(bucket.blend);
      const avgGrowth = avg(bucket.growth);
      const avgValuation = avg(bucket.valuation);
      // Sector-averaged legs -> the leaderboard's own composite + config word,
      // computed exactly as a company row is (lib/board-read).
      const read = classifyBoardRead({
        concallScore: avgBlend,
        growthScore: avgGrowth,
        valuationScore: avgValuation,
      });
      return {
        sector,
        slug: slugifySector(sector),
        companyCount: bucket.companyCount,
        subSectorCount: bucket.subSectors.size,
        reportedCount: bucket.latest.length,
        avgLatest: avg(bucket.latest),
        avg4Q: avg(bucket.avg4Q),
        avgGrowth,
        avgValuation,
        valuationCount: bucket.valuation.length,
        readScore: read.score,
        readKey: read.key,
        readLabel: BOARD_READS[read.key].label,
      };
    });

  // Rank 1 = strongest board overall by Read (competition ranks, ties share a
  // rank). No-read sectors get no rank.
  const rankSorted = [...unranked].sort(
    (a, b) =>
      (b.readScore ?? Number.NEGATIVE_INFINITY) -
        (a.readScore ?? Number.NEGATIVE_INFINITY) ||
      a.sector.localeCompare(b.sector),
  );
  const ranked = assignCompetitionRanks(rankSorted, (row) => row.readScore);
  const rankBySector = new Map<string, number>();
  ranked.forEach((row) => {
    if (row.readScore != null) rankBySector.set(row.sector, row.leaderboardRank);
  });

  const rows: SectorRow[] = unranked.map((row) => ({
    ...row,
    rank: rankBySector.get(row.sector) ?? null,
  }));

  const totalCompanies = rows.reduce((sum, row) => sum + row.companyCount, 0);

  const compareNullLast = (
    a: number | null,
    b: number | null,
    order: "asc" | "desc",
  ) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return order === "asc" ? a - b : b - a;
  };

  const sortedRows = [...rows].sort((a, b) => {
    let primary = 0;
    if (sortBy === "sector") {
      primary =
        sortOrder === "asc"
          ? a.sector.localeCompare(b.sector)
          : b.sector.localeCompare(a.sector);
    } else if (sortBy === "companies") {
      primary =
        sortOrder === "asc"
          ? a.companyCount - b.companyCount
          : b.companyCount - a.companyCount;
    } else if (sortBy === "latest_qtr") {
      primary = compareNullLast(a.avgLatest, b.avgLatest, sortOrder);
    } else if (sortBy === "avg_4q") {
      primary = compareNullLast(a.avg4Q, b.avg4Q, sortOrder);
    } else if (sortBy === "growth") {
      primary = compareNullLast(a.avgGrowth, b.avgGrowth, sortOrder);
    } else if (sortBy === "valuation") {
      primary = compareNullLast(a.avgValuation, b.avgValuation, sortOrder);
    } else {
      primary = compareNullLast(a.readScore, b.readScore, sortOrder);
    }
    if (primary !== 0) return primary;
    // Tie-break: always fall back to Read, then name.
    const tie = compareNullLast(a.readScore, b.readScore, "desc");
    if (tie !== 0) return tie;
    return a.sector.localeCompare(b.sector);
  });

  const headerHref = (key: SectorSortKey) => {
    const keyDefault = defaultDirectionForKey(key);
    const nextOrder: "asc" | "desc" =
      sortBy === key ? (sortOrder === "desc" ? "asc" : "desc") : keyDefault;
    const query = new URLSearchParams();
    if (key !== "read") query.set("sort", key);
    if (nextOrder !== keyDefault) query.set("order", nextOrder);
    const qs = query.toString();
    return qs ? `/sectors?${qs}` : "/sectors";
  };

  const arrowFor = (key: SectorSortKey) =>
    sortBy === key ? (sortOrder === "desc" ? "↓" : "↑") : "";

  // A sortable, two-line column header: label (link) over a quiet descriptor.
  const ColHead = ({
    sortKey,
    label,
    hint,
    align = "right",
    className = "",
  }: {
    sortKey: SectorSortKey;
    label: string;
    hint?: string;
    align?: "left" | "right";
    className?: string;
  }) => (
    <th className={`px-4 py-3 align-bottom ${className}`}>
      <Link
        href={headerHref(sortKey)}
        prefetch={false}
        className={`group flex flex-col ${
          align === "right" ? "items-end text-right" : "items-start text-left"
        }`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground group-hover:underline">
          {label}
          {arrowFor(sortKey) ? (
            <span className="ml-1 text-muted-foreground">{arrowFor(sortKey)}</span>
          ) : null}
        </span>
        {hint ? (
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </Link>
    </th>
  );

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <header className="flex flex-col gap-4 px-1 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Sectors
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every sector on the same scores as the leaderboard — the quarter just
              reported, the trailing four, the outlook ahead, and what you pay for it —
              folded into one Read. Ranked by Read; rank&nbsp;1 is the strongest board
              overall.
            </p>
          </div>
          <div className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">
            <p className="font-medium text-foreground">
              {totalCompanies} companies · {rows.length} sectors
            </p>
            {latestLabel ? <p>scores as of {latestLabel}</p> : null}
          </div>
        </header>

        {sortedRows.length === 0 ? (
          <div className={PANEL_CARD_NEUTRAL}>
            <p className="text-sm text-muted-foreground">
              No sectors with more than one company available.
            </p>
          </div>
        ) : (
          <section className={TABLE_CARD_SKY}>
            <div className="flex flex-col gap-1 border-b border-border/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-foreground">Sector rankings</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Ranked by Read · the leaderboard&apos;s composite
              </p>
            </div>

            {/* Below lg the 720px table left only # / Sector / ConcallScore in
                view on a phone, with the Read — the column it is ranked by — off
                to the right. So below lg each sector is one row with all five
                numbers in view; the table returns from lg. Sorting stays on the
                URL, so the pills below are plain links. */}
            <div className="lg:hidden">
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border/35 px-3 py-2 text-[11px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-[0.12em]">Sort</span>
                {(
                  [
                    ["read", "Read"],
                    ["latest_qtr", "ConcallScore"],
                    ["avg_4q", "Trailing"],
                    ["growth", "Growth"],
                    ["valuation", "Valuation"],
                    ["sector", "A–Z"],
                  ] as Array<[SectorSortKey, string]>
                ).map(([key, label]) => (
                  <Link
                    key={key}
                    href={headerHref(key)}
                    prefetch={false}
                    className={`rounded-full border px-2 py-0.5 ${
                      sortBy === key
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/60 bg-background/80 text-foreground"
                    }`}
                  >
                    {label}
                    {arrowFor(key) ? <span className="ml-0.5">{arrowFor(key)}</span> : null}
                  </Link>
                ))}
              </div>
              <ul>
                {sortedRows.map((row) => {
                  const readDef = BOARD_READS[row.readKey];
                  return (
                    <li
                      key={row.slug}
                      className="flex items-start gap-2.5 border-b border-border/45 px-3 py-3 last:border-b-0"
                    >
                      <span className="w-6 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-muted-foreground">
                        {row.rank ?? "—"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/sector/${row.slug}`}
                          prefetch={false}
                          className="font-medium leading-snug text-foreground underline-offset-4 hover:underline"
                        >
                          {row.sector}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {row.companyCount} companies
                          {row.subSectorCount > 0
                            ? ` · ${row.subSectorCount} sub-sector${row.subSectorCount === 1 ? "" : "s"}`
                            : ""}
                          {row.reportedCount > 0 ? ` · ${row.reportedCount} reported` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] leading-tight">
                          <LegStat label="Latest" score={row.avgLatest} band={quarterBand} />
                          <LegStat label="4Q" score={row.avg4Q} band={quarterBand} />
                          <LegStat label="Growth" score={row.avgGrowth} band={growthBand} />
                          <LegStat label="Value" score={row.avgValuation} band={valuationBand} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right leading-tight">
                        {row.readScore != null ? (
                          <span className="block text-base font-semibold tabular-nums text-foreground">
                            {row.readScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="block text-muted-foreground">—</span>
                        )}
                        <span
                          className={`block max-w-[6.5rem] text-[10px] font-medium ${
                            row.readScore != null ? readDef.textClass : "text-muted-foreground"
                          }`}
                        >
                          {row.readLabel}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="relative hidden lg:block">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border/35 bg-background/70">
                  <tr>
                    <th className="w-10 px-4 py-3 text-left align-bottom text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      #
                    </th>
                    <ColHead sortKey="sector" label="Sector" align="left" />
                    <ColHead sortKey="latest_qtr" label="ConcallScore" hint="latest" />
                    <ColHead sortKey="avg_4q" label="Trailing" hint="4Q avg" />
                    <ColHead sortKey="growth" label="Growth" hint="forward" />
                    <ColHead
                      sortKey="valuation"
                      label="Valuation"
                      hint="higher = cheaper"
                    />
                    <th className="border-l border-border/70 bg-amber-50/40 px-4 py-3 text-right align-bottom dark:bg-amber-950/[0.12]">
                      <Link
                        href={headerHref("read")}
                        prefetch={false}
                        className="group flex flex-col items-end text-right"
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground group-hover:underline">
                          Read
                          {arrowFor("read") ? (
                            <span className="ml-1 text-muted-foreground">
                              {arrowFor("read")}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                          the three, combined
                        </span>
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => {
                    const readDef = BOARD_READS[row.readKey];
                    return (
                      <tr
                        key={row.slug}
                        className="border-b border-border/45 transition-colors last:border-b-0 hover:bg-sky-50/25 dark:hover:bg-sky-950/10"
                      >
                        <td className="px-4 py-3 align-middle text-sm font-semibold tabular-nums text-muted-foreground">
                          {row.rank ?? "—"}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <Link
                            href={`/sector/${row.slug}`}
                            prefetch={false}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {row.sector}
                          </Link>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {row.companyCount} companies
                            {row.subSectorCount > 0
                              ? ` · ${row.subSectorCount} sub-sector${
                                  row.subSectorCount === 1 ? "" : "s"
                                }`
                              : ""}
                            {row.reportedCount > 0
                              ? ` · ${row.reportedCount} reported`
                              : ""}
                          </p>
                        </td>
                        <ScoreCell score={row.avgLatest} band={quarterBand} />
                        <ScoreCell score={row.avg4Q} band={quarterBand} />
                        <ScoreCell score={row.avgGrowth} band={growthBand} />
                        <ScoreCell score={row.avgValuation} band={valuationBand} />
                        <td className="border-l border-border/70 bg-amber-50/40 px-4 py-3 align-middle dark:bg-amber-950/[0.12]">
                          {row.readScore != null ? (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="text-[15px] font-semibold tabular-nums text-foreground">
                                {row.readScore.toFixed(1)}
                              </span>
                              <span
                                className={`text-[11px] font-medium ${readDef.textClass}`}
                              >
                                {row.readLabel}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="text-muted-foreground">—</span>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {row.readLabel}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div aria-hidden className={TABLE_SCROLL_HINT} />
            </div>

            <div className="border-t border-border/35 px-4 py-3">
              {/* Nine lines of method on a phone; folded behind one line there. */}
              <details className="sm:hidden">
                <summary className="cursor-pointer list-none text-[11px] font-medium text-muted-foreground underline decoration-border underline-offset-2 [&::-webkit-details-marker]:hidden">
                  How the Read is computed
                </summary>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Read = 0.88 × the average of the quarter leg and Growth, + 0.12 ×
                  Valuation — the leaderboard&apos;s exact formula. The quarter leg is the
                  recency-weighted trailing four quarters (latest counts double). Each sector
                  figure averages its covered companies. The word names the configuration the
                  three legs make — it is not a buy or sell call.
                </p>
              </details>
              <p className="hidden text-[11px] leading-relaxed text-muted-foreground sm:block">
                Read = 0.88 × the average of the quarter leg and Growth, + 0.12 ×
                Valuation — the leaderboard&apos;s exact formula. The quarter leg is the
                recency-weighted trailing four quarters (latest counts double); the
                ConcallScore and Trailing columns show the latest print and the flat 4Q
                mean beside it. Each sector figure averages its covered companies;
                Valuation covers only companies with a current, rateable read. The word
                names the configuration the three legs make — it describes the setup, it
                is not a buy or sell call.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
