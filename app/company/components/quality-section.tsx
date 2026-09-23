// Quality tab: five L1 SectionCards stacked — Financials, Returns & margins,
// Moat, Ownership, Forensic checks. Answers "is this a good business, and can I
// trust the books?" Server component: the charts are inline SVG / sized divs,
// the only interaction is the Moat card's native <details>.
//
// Data: `quality` is the company_quality_v1 substrate (Screener statements,
// deterministic; see lib/company-quality). `moat` is the existing v15 moat
// payload. Either feed can be absent on its own — each card carries its own
// MissingSectionState so one missing feed never blanks the tab.
import { cn } from "@/lib/utils";
import { formatCr, formatPct, formatPlain, formatPp } from "@/lib/company-quality/format";
import type {
  ForensicStatus,
  ForensicTally,
  NormalizedCompanyQuality,
  NormalizedQualityFinancials,
  NormalizedQualityForensics,
  NormalizedQualityOwnership,
  NormalizedQualityReturns,
  QualityHoldingBand,
  QualityRatioRow,
  QualityRead,
  QualitySeriesPoint,
} from "@/lib/company-quality/types";
import type { NormalizedMoatAnalysis } from "@/lib/moat-analysis/types";

import { MissingSectionState } from "./missing-section-state";
import { MoatAnalysisSection } from "./moat-analysis-section";
import { SectionCard, SectionUpdatedAt } from "./section-card";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";

export type QualitySectionProps = {
  companyCode: string;
  companyName: string | null;
  quality: NormalizedCompanyQuality | null;
  qualityGeneratedAtShort: string | null;
  moat: NormalizedMoatAnalysis | null;
  moatGeneratedAtShort: string | null;
};

// ---------------------------------------------------------------------------
// House type + colour. Display face for headlines, data face for every number.
// Positive / teal and the two status hues are the portal's own emerald / amber /
// rose so a Watch here reads the same as a Watch on the Guidance tab.
// ---------------------------------------------------------------------------
export const eyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
export const metaLabelClass = "text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
export const displayClass =
  "[font-family:var(--font-display)] font-bold tracking-[-0.02em] text-foreground [text-wrap:pretty]";
export const dataClass = "[font-family:var(--font-data)] tabular-nums";
const positiveTextClass = "text-teal-600 dark:text-teal-400";
const positiveFillClass = "bg-teal-500 dark:bg-teal-400";
const readBlockClass =
  "flex flex-col gap-3 rounded-xl border border-teal-500/30 bg-teal-500/[0.06] p-4 sm:px-5 sm:py-[18px]";

const STATUS_STYLE: Record<
  ForensicStatus,
  { label: string; text: string; bg: string; dot: string; assessed: boolean }
> = {
  clean: {
    label: "Clean",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/[0.12]",
    dot: "bg-emerald-500",
    assessed: true,
  },
  watch: {
    label: "Watch",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/[0.12]",
    dot: "bg-amber-500",
    assessed: true,
  },
  flag: {
    label: "Flag",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/[0.12]",
    dot: "bg-rose-500",
    assessed: true,
  },
  not_assessed: {
    label: "Not assessed",
    text: "text-muted-foreground",
    bg: "bg-muted/60",
    dot: "bg-muted-foreground/40",
    assessed: false,
  },
  not_applicable: {
    label: "Not applicable",
    text: "text-muted-foreground",
    bg: "bg-muted/60",
    dot: "bg-muted-foreground/40",
    assessed: false,
  },
};

const BAND_FILL: Record<QualityHoldingBand, string> = {
  promoters: "bg-muted-foreground/45",
  fiis: positiveFillClass,
  diis: "bg-violet-500 dark:bg-violet-400",
  public: "bg-muted-foreground/20",
};

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

const ReadBlock = ({ eyebrow, read }: { eyebrow: string; read: QualityRead }) => (
  <div className={readBlockClass}>
    <span className={cn(eyebrowClass, positiveTextClass)}>{eyebrow}</span>
    <p className={cn(displayClass, "text-xl leading-[1.2]")}>{read.headline}</p>
    <ul className="flex list-disc flex-col gap-2 pl-[18px] text-[13px] leading-normal text-foreground/85">
      {read.bullets.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  </div>
);

const BAR_MAX_PX = 140;

/**
 * Five-year bar chart. Prior years muted, the latest year in the positive hue,
 * a lagging year (profit growth far behind revenue growth) in amber, a loss
 * year in rose. Each bar carries a native title so hovering shows the value.
 */
const BarChart = ({
  points,
  laggingYears = [],
  unitLabel,
}: {
  points: QualitySeriesPoint[];
  laggingYears?: string[];
  unitLabel: string;
}) => {
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const cols = { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` };
  return (
    <div className="mt-auto pt-3.5">
      <div className="grid items-end gap-2.5" style={{ ...cols, height: BAR_MAX_PX }}>
        {points.map((p, i) => {
          const isLatest = i === points.length - 1;
          const isLoss = p.value != null && p.value < 0;
          const isLagging = laggingYears.includes(p.label);
          const height = p.value == null ? 0 : Math.max(2, (Math.abs(p.value) / max) * BAR_MAX_PX);
          return (
            <div
              key={p.label}
              role="img"
              aria-label={`${p.label}: ${p.value == null ? "no data" : `${formatCr(p.value)} ${unitLabel}`}`}
              title={`${p.label}: ${p.value == null ? "—" : `₹${formatCr(p.value)} ${unitLabel}`}`}
              className={cn(
                "rounded-t transition-colors",
                isLoss
                  ? "bg-rose-500/70"
                  : isLagging
                    ? "bg-amber-500/70"
                    : isLatest
                      ? positiveFillClass
                      : "bg-muted-foreground/[0.28]",
                p.value == null && "border border-dashed border-border/60 bg-transparent",
              )}
              style={{ height: p.value == null ? 24 : height }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 grid gap-2.5 border-t border-border pt-1.5" style={cols}>
        {points.map((p, i) => {
          const isLatest = i === points.length - 1;
          const isLoss = p.value != null && p.value < 0;
          const isLagging = laggingYears.includes(p.label);
          return (
            <span
              key={p.label}
              className={cn(
                dataClass,
                "text-center text-[10px]",
                isLoss
                  ? "text-rose-600 dark:text-rose-400"
                  : isLagging
                    ? "text-amber-600 dark:text-amber-400"
                    : isLatest
                      ? "text-foreground"
                      : "text-muted-foreground",
              )}
            >
              {p.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const SPARK_W = 140;
const SPARK_H = 36;
const SPARK_PAD = 4;

/** 140×36 sparkline scaled to its own min/max, 2px stroke, 3px end dot. */
const Sparkline = ({ points, className }: { points: QualitySeriesPoint[]; className: string }) => {
  const present = points
    .map((p, i) => ({ i, v: p.value }))
    .filter((p): p is { i: number; v: number } => p.v != null);
  if (present.length === 0) return <span className="block h-9" />;
  const min = Math.min(...present.map((p) => p.v));
  const max = Math.max(...present.map((p) => p.v));
  const stepX = points.length > 1 ? (SPARK_W - 2 * SPARK_PAD) / (points.length - 1) : 0;
  const y = (v: number) =>
    max === min ? SPARK_H / 2 : SPARK_H - SPARK_PAD - ((v - min) / (max - min)) * (SPARK_H - 2 * SPARK_PAD);
  const coords = present.map((p) => [SPARK_PAD + p.i * stepX, y(p.v)] as const);
  const end = coords[coords.length - 1];
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className={cn("h-9 w-full", className)}
      aria-hidden
      preserveAspectRatio="none"
    >
      <polyline
        points={coords.map(([x, yy]) => `${x.toFixed(1)},${yy.toFixed(1)}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={end[0]} cy={end[1]} r={3} fill="currentColor" />
    </svg>
  );
};

const RatioRows = ({
  eyebrow,
  rows,
  strokeClass,
}: {
  eyebrow: string;
  rows: QualityRatioRow[];
  strokeClass: string;
}) => (
  <div className={cn(elevatedBlockClass, "p-4 sm:px-5 sm:py-[18px]")}>
    <span className={eyebrowClass}>{eyebrow}</span>
    <div className="mt-2 flex flex-col">
      {rows.map((row) => {
        const firstLabel = row.points.find((p) => p.value != null)?.label;
        return (
          <div
            key={row.key}
            className="grid grid-cols-[52px_1fr_auto] items-center gap-3.5 border-b border-border/60 py-3 last:border-b-0 last:pb-0.5"
            title={row.points.map((p) => `${p.label}: ${formatPct(p.value)}`).join(" · ")}
          >
            <span className="text-[13px] font-semibold text-foreground">{row.label}</span>
            <Sparkline points={row.points} className={strokeClass} />
            <div className="flex flex-col items-end">
              <span className={cn(dataClass, "text-[15px] font-semibold text-foreground")}>
                {formatPct(row.latest)}
              </span>
              <span className={cn(dataClass, "text-[10px] text-muted-foreground")}>
                from {formatPlain(row.first)}
                {firstLabel ? ` (${firstLabel})` : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const StatusPill = ({ status }: { status: ForensicStatus }) => {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[10px] font-semibold tracking-[0.02em]",
        s.text,
        s.bg,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
};

const TallyBar = ({ tally }: { tally: ForensicTally }) => {
  const segments = (
    [
      ["clean", tally.clean],
      ["watch", tally.watch],
      ["flag", tally.flag],
    ] as const
  ).filter(([, n]) => n > 0);
  return (
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
      {segments.length === 0 ? (
        <span className="flex-1 bg-muted" />
      ) : (
        segments.map(([status, n]) => (
          <span key={status} className={STATUS_STYLE[status].dot} style={{ flex: n }} />
        ))
      )}
    </div>
  );
};

const missing = (
  props: Pick<QualitySectionProps, "companyCode" | "companyName">,
  sectionId: string,
  title: string,
  description: string,
  emitEmptyView = true,
) => (
  <MissingSectionState
    companyCode={props.companyCode}
    companyName={props.companyName}
    sectionId={sectionId}
    sectionTitle={title}
    description={description}
    emitEmptyView={emitEmptyView}
  />
);

// ---------------------------------------------------------------------------
// 1 · Financials
// ---------------------------------------------------------------------------

const FinancialsBody = ({ data }: { data: NormalizedQualityFinancials }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1.1fr] md:items-stretch">
    <div className={cn(elevatedBlockClass, "flex flex-col p-4 sm:px-5 sm:py-[18px]")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={eyebrowClass}>Revenue</span>
        {data.revenueCagrPct != null && (
          <span className={cn(dataClass, "text-[11px] font-semibold", positiveTextClass)}>
            {formatPct(data.revenueCagrPct, 0)} CAGR
          </span>
        )}
      </div>
      <p className={cn(displayClass, "mt-1.5 text-[28px] leading-none tracking-[-0.03em]")}>
        {formatCr(data.revenueLatest)}
      </p>
      <BarChart points={data.revenue} unitLabel="cr" />
    </div>
    <div className={cn(elevatedBlockClass, "flex flex-col p-4 sm:px-5 sm:py-[18px]")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={eyebrowClass}>Net profit</span>
        {data.netProfitCagrPct != null && (
          <span className={cn(dataClass, "text-[11px] font-semibold", positiveTextClass)}>
            {formatPct(data.netProfitCagrPct, 0)} CAGR
          </span>
        )}
      </div>
      <p className={cn(displayClass, "mt-1.5 text-[28px] leading-none tracking-[-0.03em]")}>
        {formatCr(data.netProfitLatest)}
      </p>
      <BarChart points={data.netProfit} laggingYears={data.laggingYears} unitLabel="cr" />
    </div>
    <ReadBlock eyebrow="What happened" read={data.read} />
  </div>
);

// ---------------------------------------------------------------------------
// 2 · Returns & margins
// ---------------------------------------------------------------------------

const ReturnsBody = ({ data }: { data: NormalizedQualityReturns }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1.1fr] md:items-stretch">
    {data.returns.length > 0 ? (
      <RatioRows eyebrow="Return ratios" rows={data.returns} strokeClass={positiveTextClass} />
    ) : (
      <div className={cn(elevatedBlockClass, "p-4 text-[13px] text-muted-foreground")}>
        Return ratios not available for this company.
      </div>
    )}
    {data.margins.length > 0 ? (
      <RatioRows eyebrow="Margins" rows={data.margins} strokeClass="text-sky-600 dark:text-sky-400" />
    ) : (
      <div className={cn(elevatedBlockClass, "p-4 text-[13px] text-muted-foreground")}>
        Margins not available for this company.
      </div>
    )}
    <ReadBlock eyebrow="The read" read={data.read} />
  </div>
);

// ---------------------------------------------------------------------------
// 4 · Ownership
// ---------------------------------------------------------------------------

const LEGEND: Array<{ band: QualityHoldingBand; label: string }> = [
  { band: "promoters", label: "Promoter" },
  { band: "fiis", label: "FII" },
  { band: "diis", label: "DII" },
  { band: "public", label: "Public" },
];

const OwnershipBody = ({ data }: { data: NormalizedQualityOwnership }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.35fr_1fr] md:items-stretch">
    <div className={cn(elevatedBlockClass, "flex flex-col gap-3.5 p-4 sm:px-5 sm:py-[18px]")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <span className={eyebrowClass}>Shareholding pattern</span>
        <div className="flex gap-3">
          {LEGEND.map((l) => (
            <span
              key={l.band}
              className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
            >
              <span className={cn("h-[9px] w-[9px] rounded-[2px]", BAND_FILL[l.band])} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {data.quarters.map((q) => (
          <div key={q.period} className="grid grid-cols-[62px_1fr] items-center gap-2.5">
            <span className={cn(dataClass, "text-[10.5px] text-muted-foreground")}>{q.period}</span>
            <div
              className="flex h-[18px] gap-0.5 overflow-hidden rounded"
              role="img"
              aria-label={`${q.period}: promoters ${formatPct(q.bands.promoters)}, FII ${formatPct(q.bands.fiis)}, DII ${formatPct(q.bands.diis)}, public ${formatPct(q.bands.public)}`}
            >
              {LEGEND.map((l) => (
                <span
                  key={l.band}
                  className={BAND_FILL[l.band]}
                  style={{ width: `${q.bands[l.band]}%` }}
                  title={`${l.label} ${formatPct(q.bands[l.band])}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 border-t border-border pt-3">
        {data.summary.map((s) => (
          <div key={s.band} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
            <span className={cn(dataClass, "text-[15px] font-semibold text-foreground")}>
              {formatPct(s.latest)}
            </span>
            <span
              className={cn(
                dataClass,
                "text-[10.5px]",
                s.change != null && s.change >= 0.05 ? positiveTextClass : "text-muted-foreground",
              )}
            >
              {formatPp(s.change)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[13px] leading-normal text-foreground/85">
        <b className="font-semibold text-foreground">{data.takeaway.lead}</b> {data.takeaway.rest}
      </p>
    </div>
    <div className={cn(elevatedBlockClass, "flex flex-col gap-3.5 p-4 sm:px-5 sm:py-[18px]")}>
      <span className={eyebrowClass}>Promoters</span>
      <p className={cn(displayClass, "text-xl leading-[1.2]")}>{data.promoters.headline}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className={cn(nestedDetailClass, "flex flex-col gap-0.5 px-3 py-2.5")}>
          <span className="text-[11px] text-muted-foreground">Pledged</span>
          <span
            className={cn(
              dataClass,
              "text-[15px] font-semibold",
              data.promoters.pledgedPct == null
                ? "text-muted-foreground"
                : data.promoters.pledgedPct <= 0
                  ? positiveTextClass
                  : "text-amber-600 dark:text-amber-400",
            )}
          >
            {data.promoters.pledgedPct == null ? "Not tracked" : formatPct(data.promoters.pledgedPct)}
          </span>
        </div>
        <div className={cn(nestedDetailClass, "flex flex-col gap-0.5 px-3 py-2.5")}>
          <span className="text-[11px] text-muted-foreground">Net 12m</span>
          <span className={cn(dataClass, "text-[15px] font-semibold text-foreground")}>
            {data.promoters.stance ?? "—"}
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        {data.promoters.events.length === 0 ? (
          <p className="border-t border-border/60 pt-2.5 text-[13px] leading-snug text-muted-foreground">
            No change in the promoter holding across the window. Open-market trades, allotments and
            pledges from exchange disclosures are not tracked here yet.
          </p>
        ) : (
          data.promoters.events.map((e, i) => (
            <div
              key={`${e.when}-${i}`}
              className="grid grid-cols-[70px_1fr] gap-3 border-t border-border/60 py-2.5 last:pb-0"
            >
              <span className={cn(dataClass, "text-[10.5px] text-muted-foreground")}>{e.when}</span>
              <span className="text-[13px] leading-snug text-foreground/90">{e.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// 5 · Forensic checks
// ---------------------------------------------------------------------------

const ForensicsBody = ({ data }: { data: NormalizedQualityForensics }) => {
  const legend = [
    { status: "clean" as const, n: data.tally.clean },
    { status: "watch" as const, n: data.tally.watch },
    { status: "flag" as const, n: data.tally.flag },
  ];
  const unassessed = data.checks.length - data.tally.assessed;
  return (
    <div className="flex flex-col gap-4">
      <div className={cn(elevatedBlockClass, "grid grid-cols-1 md:grid-cols-[1fr_300px]")}>
        <div className="flex flex-col gap-2.5 p-4 sm:px-6 sm:py-5">
          <span className={eyebrowClass}>The read</span>
          <p className={cn(displayClass, "text-[22px] leading-[1.2]")}>{data.read.headline}</p>
          <p className="max-w-[640px] text-[13.5px] leading-[1.55] text-foreground/85 [text-wrap:pretty]">
            {data.read.body}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 border-t border-border p-4 sm:px-6 sm:py-5 md:border-l md:border-t-0">
          <TallyBar tally={data.tally} />
          <div className="flex flex-col gap-1.5">
            {legend.map((l) => (
              <div
                key={l.status}
                className={cn(
                  "flex items-center gap-2 text-[13px]",
                  l.n === 0 ? "text-muted-foreground" : "text-foreground",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[l.status].dot)} />
                <span>{STATUS_STYLE[l.status].label}</span>
                <span className={cn(dataClass, "ml-auto text-[13px] font-semibold")}>{l.n}</span>
              </div>
            ))}
            {unassessed > 0 && (
              <p className="pt-1 text-[11px] leading-snug text-muted-foreground">
                {unassessed} of {data.checks.length} not counted (not assessed or not applicable).
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.checks.map((c) => {
          const muted = !STATUS_STYLE[c.status].assessed;
          return (
            <div
              key={c.id}
              className={cn(
                "flex flex-col gap-2 rounded-xl border border-border/35 bg-background/60 px-4 py-3.5 shadow-sm shadow-black/10",
                muted && "bg-background/35",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    muted ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {c.name}
                </span>
                <StatusPill status={c.status} />
              </div>
              <span
                className={cn(
                  dataClass,
                  "text-[15px] font-semibold",
                  muted ? "text-muted-foreground/80" : "text-foreground",
                )}
              >
                {c.metric}
              </span>
              <span className="text-[12.5px] leading-[1.45] text-muted-foreground [text-wrap:pretty]">
                {c.note}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function QualitySection(props: QualitySectionProps) {
  const { companyCode, companyName, quality, qualityGeneratedAtShort, moat, moatGeneratedAtShort } = props;
  const financials = quality?.financials ?? null;
  const returns = quality?.returns ?? null;
  const ownership = quality?.ownership ?? null;
  const forensics = quality?.forensics ?? null;

  // The sign-up gate needs exactly one `data-gate-cut` in the panel. With the
  // substrate it sits on the Returns card (Financials is the free preview);
  // without it, the moat's Full-analysis block carries the cut so the tab does
  // not silently ungate for every company that has no row yet.
  const moatCard = (
    <SectionCard
      id="quality-moat"
      title="Moat"
      tone="emerald"
      headerAction={<SectionUpdatedAt date={moatGeneratedAtShort} />}
      feedbackEnabled={Boolean(moat)}
      feedbackCompanyCode={companyCode}
      feedbackCompanyName={companyName}
    >
      {moat ? (
        <MoatAnalysisSection analysis={moat} generatedAtShort={moatGeneratedAtShort} gateCut={!quality} />
      ) : (
        missing(props, "quality-moat", "Moat", "We haven't published a moat read for this company yet.")
      )}
    </SectionCard>
  );

  // No substrate row at all: one honest empty card in place of the four data
  // cards, rather than four identical "not ready" boxes above and below the moat.
  if (!quality) {
    return (
      <div className="flex flex-col gap-4">
        <SectionCard id="quality-financials" title="Financials, returns, ownership & forensic checks" tone="emerald">
          {missing(
            props,
            "quality-financials",
            "Financials & forensic checks",
            "Five-year financials, return ratios, shareholding and the nine forensic checks have not been built for this company yet.",
          )}
        </SectionCard>
        {moatCard}
      </div>
    );
  }

  const dataStamp = <SectionUpdatedAt date={qualityGeneratedAtShort} />;
  const rangeStamp = (range: string | undefined, suffix?: string) => (
    <span className={cn(dataClass, "whitespace-nowrap text-[11px] text-muted-foreground")}>
      {range ?? ""}
      {suffix ? ` · ${suffix}` : ""}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        id="quality-financials"
        title="Financials"
        tone="emerald"
        headerAction={financials ? rangeStamp(financials.yearRange, "₹ cr") : dataStamp}
      >
        {financials ? (
          <FinancialsBody data={financials} />
        ) : (
          missing(props, "quality-financials", "Financials", "Five-year revenue and profit are not available for this company yet.")
        )}
      </SectionCard>

      {/* Sign-up gate cut: the Financials card is the free preview; everything
          from Returns down is what a logged-out reader signs up for. */}
      <SectionCard
        id="quality-returns"
        title="Returns & margins"
        tone="emerald"
        headerAction={returns ? rangeStamp(returns.yearRange) : dataStamp}
      >
        <div data-gate-cut>
          {returns ? (
            <ReturnsBody data={returns} />
          ) : (
            missing(props, "quality-returns", "Returns & margins", "Return ratios and margins are not available for this company yet.", false)
          )}
        </div>
      </SectionCard>

      {moatCard}

      <SectionCard
        id="quality-ownership"
        title="Ownership"
        tone="slate"
        headerAction={ownership ? rangeStamp(ownership.quarterRange) : dataStamp}
      >
        {ownership ? (
          <OwnershipBody data={ownership} />
        ) : (
          missing(props, "quality-ownership", "Ownership", "Quarterly shareholding is not available for this company yet.", false)
        )}
      </SectionCard>

      <SectionCard
        id="quality-forensics"
        title="Forensic checks"
        tone="rose"
        headerAction={forensics ? rangeStamp(forensics.asOfLabel) : dataStamp}
      >
        {forensics ? (
          <ForensicsBody data={forensics} />
        ) : (
          missing(props, "quality-forensics", "Forensic checks", "The forensic screen is not available for this company yet.", false)
        )}
      </SectionCard>

      {quality.sourceNotes.length > 0 && (
        <p className={cn(metaLabelClass, "px-1 normal-case tracking-normal")}>
          Source: Screener.in {quality.sourceVariant} statements. {quality.sourceNotes.join(" · ")}.
        </p>
      )}
    </div>
  );
}
