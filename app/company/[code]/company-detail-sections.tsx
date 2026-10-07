import { normalizeBusinessSnapshot } from "@/lib/business-snapshot/normalize";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import { getGuidanceSnapshotRow } from "@/lib/guidance-snapshot/get";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import { buildEvidenceByKey } from "@/lib/guidance-tracking/horizon-split";
import { buildGuidanceVerdict } from "@/lib/guidance-tracking/verdict";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import { getCompanyQualityRow } from "@/lib/company-quality/get";
import { normalizeCompanyQuality } from "@/lib/company-quality/normalize";
import { assessStaleness, normalizeValuationCheck } from "@/lib/valuation-check/normalize";
import { getWalkTheTalk } from "@/lib/walk-the-talk/get";
import { createClient } from "@/lib/supabase/server";
import {
  parseForwardStrength,
  parseStrategyNarrative,
} from "@/lib/guidance-snapshot/types";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";
import type { QuarterExpectationData } from "@/lib/quarter-expectation/build";
import { buildExpectedEarnings } from "@/lib/quarter-expectation/earnings";
import { quarterCalendarRowSchema, type ExpectationCalendar } from "@/lib/quarter-expectation/types";
import { buildExpectedUpdates, parseRationaleLines } from "@/lib/quarter-expectation/updates";
import { logger } from "@/lib/logger";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import type { ValuationCheckRow } from "@/lib/valuation-check/types";
import {
  buildValuationScoreHistory,
  type ValuationScoreHistoryRow,
} from "@/lib/valuation-check/history";
import type { CompanyPageOverviewCacheRow } from "@/lib/company-overview-cache";

import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { scoreWrittenAt } from "@/lib/score-freshness";
import { SectionCard, SectionUpdatedAt } from "../components/section-card";
import { BusinessSnapshotSection } from "../components/business-snapshot-section";
import { FutureGrowthSection } from "../components/future-growth-section";
import { IndustryContextSection } from "../components/industry-context-section";
import { KeyVariablesSection } from "../components/key-variables-section";
import { MissingSectionState } from "../components/missing-section-state";
import { QualitySection } from "../components/quality-section";
import { ValuationCheckSection } from "../components/valuation-check-section";
import { WalkTheTalkSection } from "../components/walk-the-talk-section";
import { GuidanceHeaderPills } from "../components/guidance-header-pills";
import {
  CompanyCommentsSection,
  GuidanceHistorySection,
  ConcallScoreSection,
} from "../components/deferred-company-sections";
import { parseSummary, transformToChartData } from "../utils";
import type { QuarterData } from "../types";
import { formatShortDate } from "./page-helpers";

type CompanyDetailSectionProps = {
  overview: CompanyPageOverviewCacheRow;
};

const missingSectionState = (
  overview: CompanyPageOverviewCacheRow,
  sectionId: string,
  sectionTitle: string,
  description: string,
  // Valuation Check fires its own empty_section beacon (no_valuation / unrated /
  // stale), so it opts out here to avoid double-counting the empty view.
  emitEmptyView = true,
) => (
  <MissingSectionState
    companyCode={overview.company_code}
    companyName={overview.company_name}
    sectionId={sectionId}
    sectionTitle={sectionTitle}
    description={description}
    emitEmptyView={emitEmptyView}
  />
);

export function IndustryContextPanel({ overview }: CompanyDetailSectionProps) {
  // No self-Suspense: page.tsx wraps this panel once, like every sibling panel.
  return (
    <IndustryContextSection
      companyCode={overview.company_code}
      companyName={overview.company_name}
    />
  );
}

export async function BusinessSnapshotPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const [{ data: companyRow }, { data: businessSnapshotData }] =
    await Promise.all([
      supabase
        .from("company")
        .select("website")
        .eq("code", overview.company_code)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("business_snapshot")
        .select(
          "company, generated_at, segment_profiles, business_snapshot, historical_economics, about_company, revenue_breakdown, revenue_engine, details, snapshot_phase, snapshot_source, source_urls",
        )
        .eq("company", overview.company_code)
        .order("generated_at", { ascending: false })
        .limit(1),
    ]);
  const normalizedBusinessSnapshot = normalizeBusinessSnapshot({
    companyCode: overview.company_code,
    companyWebsite: (companyRow as { website?: string | null } | null)?.website ?? null,
    snapshotRow: businessSnapshotData?.[0] ?? null,
  });

  return (
    <BusinessSnapshotSection
      snapshot={normalizedBusinessSnapshot}
      companyCode={overview.company_code}
      companyName={overview.company_name}
      generatedAtShort={formatShortDate(normalizedBusinessSnapshot?.generatedAtRaw)}
    />
  );
}

export async function QualityPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const [{ data: moatAnalysisData }, qualityRow] = await Promise.all([
    supabase
      .from("moat_analysis")
      .select(
        "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
      )
      .eq("company_code", overview.company_code)
      .limit(1),
    getCompanyQualityRow(overview.company_code),
  ]);
  const normalizedMoatAnalysis = normalizeMoatAnalysis(
    (moatAnalysisData?.[0] as MoatAnalysisRow | undefined) ?? null,
  );
  const quality = normalizeCompanyQuality(qualityRow);

  return (
    <QualitySection
      companyCode={overview.company_code}
      companyName={overview.company_name}
      quality={quality}
      qualityGeneratedAtShort={formatShortDate(quality?.generatedAtRaw)}
      moat={normalizedMoatAnalysis}
      moatGeneratedAtShort={formatShortDate(normalizedMoatAnalysis?.updatedAtRaw)}
    />
  );
}

export async function ConcallScorePanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  // The quarter in reporting season — the one the expectation card is about.
  const target = currentReportingQuarter();
  const [{ data, error }, { data: keyVarData }, growthResult, calendarResult, guidanceSnapshotRow] =
    await Promise.all([
      supabase
        .from("concall_analysis")
        .select()
        .eq("company_code", overview.company_code)
        // legacy-logic scores (no details.scoring_meta) are hidden portal-wide
        .not("details->scoring_meta", "is", null)
        .order("fy", { ascending: false })
        .order("qtr", { ascending: false })
        .limit(24),
      // Key variables feed the "What to listen for" list (watch-for triggers).
      supabase
        .from("key_variables_snapshot")
        .select(
          "company_code, generated_at, discovery_summary, full_variable_list, deep_treatment, section_synthesis, details, updated_at",
        )
        .eq("company_code", overview.company_code)
        .order("generated_at", { ascending: false })
        .limit(1),
      // Score for the setup chip; catalysts for the list. The catalyst list is
      // read from its column and, for the double-nested rows (details.details),
      // from the JSON path — never the whole details blob (fact base + earnings
      // ladder are heavy and the Growth tab already pays for them).
      supabase
        .from("growth_outlook")
        .select("growth_score, run_timestamp, catalysts, nested_catalysts:details->details->catalysts")
        .or(`company.eq.${overview.company_code},company.eq.${overview.company_name}`)
        .order("run_timestamp", { ascending: false })
        .limit(1),
      // When the quarter reports and when its call is (concallyser's
      // sync_quarter_calendar.py). One row per (company, fy, qtr).
      supabase
        .from("quarter_calendar")
        .select("company_code, fy, qtr, results_date, call_date, call_time, call_status, call_source_url")
        .eq("company_code", overview.company_code)
        .eq("fy", target.fy)
        .eq("qtr", target.qtr)
        .limit(1),
      // The same cached guidance_snapshot row the Guidance and Growth panels
      // read — one query per request across the three.
      getGuidanceSnapshotRow(overview.company_code).catch(() => null),
    ]);

  if (error) throw error;
  // The forward inputs are non-fatal: a calendar or growth outage degrades the
  // card ("date not announced", no catalyst), never the score trail.
  if (growthResult.error) {
    logger.warn("concall-score: growth_outlook read failed", { error: growthResult.error });
  }
  if (calendarResult.error) {
    logger.warn("concall-score: quarter_calendar read failed", { error: calendarResult.error });
  }

  const keyVarSnapshot = normalizeKeyVariablesSnapshot(
    (keyVarData?.[0] as KeyVariablesSnapshotRow | undefined) ?? null,
  );
  const growthRow = (growthResult.data?.[0] ?? null) as {
    growth_score?: unknown;
    run_timestamp?: unknown;
    catalysts?: unknown;
    nested_catalysts?: unknown;
  } | null;
  const growthScoreRaw = growthRow?.growth_score;
  const growthScore =
    growthScoreRaw != null && Number.isFinite(Number(growthScoreRaw)) ? Number(growthScoreRaw) : null;
  const growthOutlook = growthRow
    ? normalizeGrowthOutlook({
        details: null,
        growthScore: growthRow.growth_score,
        runTimestamp: growthRow.run_timestamp,
        catalysts: growthRow.catalysts ?? growthRow.nested_catalysts,
      })
    : null;
  const quarters = ((data ?? []) as QuarterData[]).map((row) => ({
    ...row,
    summary: parseSummary(row.summary),
  }));
  const chartData = transformToChartData(quarters, 24);
  const detailQuarters = quarters.slice(0, 24);
  // Last-updated = the newest scored_at across the rows (a re-score of an
  // older quarter is newer than the latest quarter's first write).
  const latestScoredAt = quarters.reduce<string | null>((latest, row) => {
    const written = scoreWrittenAt({
      scored_at:
        (row.details as { scoring_meta?: { scored_at?: string | null } } | null)?.scoring_meta
          ?.scored_at ?? null,
    });
    return written && (!latest || written > latest) ? written : latest;
  }, null);

  // The expectation card's server-built half (lib/quarter-expectation): the
  // calendar, the issuer's guide for the period, and what the call is due to
  // update on. Only this small shape crosses to the client chunk.
  const calendarParsed = quarterCalendarRowSchema.safeParse(calendarResult.data?.[0] ?? null);
  const calendar: ExpectationCalendar | null = calendarParsed.success
    ? {
        resultsDate: calendarParsed.data.results_date,
        callDate: calendarParsed.data.call_date,
        callTime: calendarParsed.data.call_time,
        callUrl: calendarParsed.data.call_source_url,
        callUnreadable: calendarParsed.data.call_status === "unreadable",
      }
    : null;
  const guidanceItems = normalizeGuidanceSnapshot(guidanceSnapshotRow)?.guidanceItems ?? [];
  const expectation: QuarterExpectationData = {
    target,
    calendar,
    earnings: buildExpectedEarnings({ target, guidanceItems }),
    updates: buildExpectedUpdates({
      target,
      guidanceItems,
      catalysts: growthOutlook?.catalysts ?? [],
      variables: keyVarSnapshot?.fullVariableList ?? [],
      deepVariables: keyVarSnapshot?.deepTreatment ?? [],
      lastRationale: parseRationaleLines(detailQuarters[0]?.details ?? null),
    }),
  };

  return (
    <SectionCard
      id="sentiment-score"
      title="ConcallScore"
      feedbackEnabled
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerAction={<SectionUpdatedAt date={formatShortDate(latestScoredAt)} />}
    >
      <ConcallScoreSection
        chartData={chartData}
        detailQuarters={detailQuarters}
        growthScore={growthScore}
        expectation={expectation}
      />
    </SectionCard>
  );
}

export async function KeyVariablesPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const { data: keyVariablesSnapshotData } = await supabase
    .from("key_variables_snapshot")
    .select(
      "company_code, generated_at, discovery_summary, full_variable_list, deep_treatment, section_synthesis, details, updated_at",
    )
    .eq("company_code", overview.company_code)
    .order("generated_at", { ascending: false })
    .limit(1);
  const normalizedKeyVariablesSnapshot = normalizeKeyVariablesSnapshot(
    (keyVariablesSnapshotData?.[0] as KeyVariablesSnapshotRow | undefined) ?? null,
  );

  return (
    <SectionCard
      id="key-variables"
      title="Key Variables"
      feedbackEnabled={Boolean(normalizedKeyVariablesSnapshot)}
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerAction={
        <SectionUpdatedAt date={formatShortDate(normalizedKeyVariablesSnapshot?.generatedAtRaw)} />
      }
    >
      {normalizedKeyVariablesSnapshot ? (
        <KeyVariablesSection
          snapshot={normalizedKeyVariablesSnapshot}
          companyCode={overview.company_code}
          companyName={overview.company_name}
        />
      ) : (
        missingSectionState(
          overview,
          "key-variables",
          "Key Variables",
          "We have not generated a key variables snapshot for this company yet.",
        )
      )}
    </SectionCard>
  );
}

export async function FutureGrowthPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  // The "Growth engine" card is the guidance deep-track's strategy narrative:
  // the single bet the live guides express is how the company grows, so it
  // reads here rather than on the Guidance tab (2026-09-18). It comes off the
  // same cached guidance_snapshot row the Guidance panel renders. A failed or
  // absent read resolves to null and the summary card simply takes the row.
  const [{ data: growthData }, guidanceSnapshotRow] = await Promise.all([
    supabase
      .from("growth_outlook")
      .select("*")
      .or(`company.eq.${overview.company_code},company.eq.${overview.company_name}`)
      .order("run_timestamp", { ascending: false })
      .limit(1),
    getGuidanceSnapshotRow(overview.company_code).catch(() => null),
  ]);
  const guidanceSnapshot = normalizeGuidanceSnapshot(guidanceSnapshotRow);
  const growthEngine = parseStrategyNarrative(guidanceSnapshot?.details ?? null);
  const growthEngineAsOf = growthEngine
    ? formatShortDate(guidanceSnapshot?.updatedAtRaw ?? guidanceSnapshot?.generatedAtRaw)
    : null;
  const normalizedGrowthOutlook = normalizeGrowthOutlook({
    details: growthData?.[0]?.details,
    growthScore: growthData?.[0]?.growth_score,
    runTimestamp: growthData?.[0]?.run_timestamp,
    companyName: growthData?.[0]?.company_name,
    fiscalYear: growthData?.[0]?.fiscal_year,
    horizonQuarters: growthData?.[0]?.horizon_quarters,
    horizonYears: growthData?.[0]?.horizon_years,
    baseGrowthPct: growthData?.[0]?.base_growth_pct,
    upsideGrowthPct: growthData?.[0]?.upside_growth_pct,
    downsideGrowthPct: growthData?.[0]?.downside_growth_pct,
    growthScoreFormula: growthData?.[0]?.growth_score_formula,
    growthScoreSteps: growthData?.[0]?.growth_score_steps,
    factBase: growthData?.[0]?.fact_base,
    summaryBullets: growthData?.[0]?.summary_bullets,
    catalysts: growthData?.[0]?.catalysts,
    scenarios: growthData?.[0]?.scenarios,
  });

  return (
    <FutureGrowthSection
      outlook={normalizedGrowthOutlook}
      growthEngine={growthEngine}
      growthEngineAsOf={growthEngineAsOf}
      companyCode={overview.company_code}
      companyName={overview.company_name}
    />
  );
}

export async function WalkTheTalkPanel({ overview }: CompanyDetailSectionProps) {
  const snapshot = await getWalkTheTalk(overview.company_code);
  const generatedAtShort = formatShortDate(snapshot.updatedAtRaw);
  const hasRow = snapshot.schemaStatus !== "missing";

  return (
    <SectionCard
      id="walk-the-talk"
      title="Walk the Talk"
      feedbackEnabled={hasRow}
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerAction={<SectionUpdatedAt date={generatedAtShort} />}
    >
      {hasRow ? (
        <WalkTheTalkSection snapshot={snapshot} />
      ) : (
        missingSectionState(
          overview,
          "walk-the-talk",
          "Walk the Talk",
          "We have not yet computed a management commitment delivery score for this company.",
        )
      )}
    </SectionCard>
  );
}

export async function GuidanceHistoryPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const guidanceSnapshotRow = await getGuidanceSnapshotRow(overview.company_code);
  // The stored credibility verdict wins over the counted tier wherever it
  // exists (lib/walk-the-talk/types.ts resolveCredibilityVerdict).
  const scoredCredibility = (
    guidanceSnapshotRow as { credibility_verdict?: unknown } | null
  )?.credibility_verdict;
  const normalizedGuidanceSnapshot = normalizeGuidanceSnapshot(guidanceSnapshotRow);
  const forwardStrength = parseForwardStrength(normalizedGuidanceSnapshot?.details ?? null);
  // Per-thread evidence_class lives on guidance_tracking.details, not on the
  // snapshot's guidance_items, so the This year / Long-term cards join it in
  // by guidance_key. Only deep-tracked snapshots (the ones with a
  // forward-strength block) have classes to read; everyone else skips the
  // round-trip. A failed read just hides the per-card evidence line.
  let evidenceByKey: ReturnType<typeof buildEvidenceByKey> = {};
  if (forwardStrength) {
    const { data: evidenceRows } = await supabase
      .from("guidance_tracking")
      .select("guidance_key, evidence_class:details->>evidence_class")
      .eq("company_code", overview.company_code)
      .not("details->>evidence_class", "is", null);
    evidenceByKey = buildEvidenceByKey(
      evidenceRows as { guidance_key?: unknown; evidence_class?: unknown }[] | null,
    );
  }
  // Legacy guidance_tracking predates the Phase 6 v2 snapshot and has no
  // horizon data. Fetch it only when the snapshot came back empty — most
  // companies have both rows and the snapshot always wins, so fetching
  // legacy unconditionally was a discarded round-trip (8-9 KB of JSONB) on
  // every one of those page loads (/plan-eng-review Issue 7, 2026-09-06).
  // A handful of companies (e.g. ARMANFIN) have ONLY the legacy row and
  // depend on this fallback for a working Guidance section.
  let legacyGuidanceItems: ReturnType<typeof normalizeGuidanceTrackingRows> = [];
  let legacyGeneratedAt: string | null | undefined;
  if (!normalizedGuidanceSnapshot) {
    const guidanceTrackingResult = await supabase
      .from("guidance_tracking")
      .select(
        "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details",
      )
      .eq("company_code", overview.company_code)
      .order("generated_at", { ascending: false })
      .order("id", { ascending: false });
    legacyGuidanceItems = normalizeGuidanceTrackingRows(
      (guidanceTrackingResult.data as GuidanceTrackingRow[] | null | undefined) ?? null,
    );
    legacyGeneratedAt = (guidanceTrackingResult.data as { generated_at?: string | null }[] | null)?.[0]
      ?.generated_at;
  }
  const guidanceItems = normalizedGuidanceSnapshot?.guidanceItems ?? legacyGuidanceItems;
  const guidanceUpdatedAtShort = formatShortDate(
    normalizedGuidanceSnapshot?.updatedAtRaw ?? normalizedGuidanceSnapshot?.generatedAtRaw ?? legacyGeneratedAt,
  );
  // One reporting-quarter anchor shared by the header pills and the section
  // body, so the header tier and the body's live/resolved split never
  // disagree (quarter-aware — see lib/guidance-tracking/verdict.ts horizonPhase).
  const guidanceQtr = currentReportingQuarter();
  const guidanceVerdict =
    guidanceItems.length > 0 ? buildGuidanceVerdict(guidanceItems, guidanceQtr, scoredCredibility) : null;
  return (
    <SectionCard
      id="guidance-history"
      title="Guidance"
      feedbackEnabled={Boolean(normalizedGuidanceSnapshot || guidanceItems.length > 0)}
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerAction={
        <>
          {guidanceVerdict ? <GuidanceHeaderPills verdict={guidanceVerdict} /> : null}
          <SectionUpdatedAt date={guidanceUpdatedAtShort} />
        </>
      }
    >
      {guidanceItems.length > 0 ? (
        <GuidanceHistorySection
          items={guidanceItems}
          sourceFiles={normalizedGuidanceSnapshot?.sourceFiles}
          currentQtr={guidanceQtr}
          forwardStrength={forwardStrength}
          evidenceByKey={evidenceByKey}
          credibilityVerdict={scoredCredibility}
        />
      ) : (
        missingSectionState(
          overview,
          "guidance-history",
          "Guidance",
          "We have not tracked meaningful management guidance for this company yet.",
        )
      )}
    </SectionCard>
  );
}

export function CommunityPanel({ overview }: CompanyDetailSectionProps) {
  return (
    <SectionCard
      id="community"
      title="Community"
      feedbackEnabled
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
    >
      <CompanyCommentsSection companyCode={overview.company_code} />
    </SectionCard>
  );
}


export async function ValuationCheckPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("valuation_check")
    .select("*")
    .eq("company_code", overview.company_code)
    .eq("valuation_published", true)
    .limit(1);

  const valuation = normalizeValuationCheck(
    (data?.[0] as ValuationCheckRow | undefined) ?? null,
  );

  // The score-over-time series for the sparkline. Separate query, and deliberately
  // non-fatal: if `valuation_check_history` errors (e.g. schema not migrated) the
  // destructure yields null, the series is empty, and the sparkline simply hides —
  // the verdict block above is unaffected.
  // `published` was added in the 2026-08-15 ledger migration, so the bulk of history
  // predates it and is NULL — not "unpublished", just "written before the column
  // existed" (0 rows are explicitly false). We include NULL and exclude only an
  // explicit false (an `--unpublish` event), so legacy pricings still plot.
  const { data: historyRows } = await supabase
    .from("valuation_check_history")
    .select("priced_as_of, recorded_at, score")
    .eq("company_code", overview.company_code)
    .not("published", "is", false)
    .order("priced_as_of", { ascending: true });

  const scoreHistory = buildValuationScoreHistory(
    (historyRows as ValuationScoreHistoryRow[] | null) ?? null,
  );
  // Staleness is assessed at render time, not at write time: the row is fine, it is the
  // price underneath it that ages. Without a live quote only the age bound applies.
  const staleness = valuation
    ? assessStaleness(valuation)
    : { stale: false, reason: null, ageDays: null };

  return (
    <SectionCard
      id="valuation-check"
      title="Valuation Check"
      feedbackEnabled={Boolean(valuation)}
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerAction={<SectionUpdatedAt date={formatShortDate(valuation?.pricedAsOf)} />}
    >
      {!valuation ? (
        <AnalyticsBeacon
          event="empty_section"
          sectionId="valuation-check"
          companyCode={overview.company_code}
          reason="no_valuation"
        />
      ) : staleness.stale ? (
        <AnalyticsBeacon
          event="stale_valuation"
          companyCode={overview.company_code}
          daysStale={staleness.ageDays ?? 0}
        />
      ) : !(valuation.rateable && valuation.verdict) ? (
        <AnalyticsBeacon
          event="empty_section"
          sectionId="valuation-check"
          companyCode={overview.company_code}
          reason="unrated"
        />
      ) : null}
      {valuation ? (
        <ValuationCheckSection
          valuation={valuation}
          staleness={staleness}
          scoreHistory={scoreHistory}
        />
      ) : (
        missingSectionState(
          overview,
          "valuation-check",
          "Valuation Check",
          "We have not published a valuation read for this company yet.",
          false,
        )
      )}
    </SectionCard>
  );
}
