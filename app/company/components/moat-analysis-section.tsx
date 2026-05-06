import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock,
  Minus,
  ShieldCheck,
  Target,
} from "lucide-react";

import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import {
  moatTierClass,
  moatTierGradeClass,
  moatTierGradeIconClass,
  moatTierGradeLabel,
} from "@/lib/moat-analysis/tier-class";
import type {
  V15Gatekeeper,
  MoatTier,
  NormalizedMoatAnalysis,
  V15Source,
} from "@/lib/moat-analysis/types";
import { cn } from "@/lib/utils";

type MoatAnalysisSectionProps = {
  analysis: NormalizedMoatAnalysis;
  generatedAtShort: string | null;
};

type ChipTone = "emerald" | "sky" | "amber" | "rose" | "violet" | "slate";

const dashedDetailClass = cn(nestedDetailClass, "border-dashed border-border/50");

const chipBaseClass =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none";

const toneClasses: Record<ChipTone, string> = {
  emerald:
    "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
  sky: "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
  amber:
    "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
  rose: "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
  violet:
    "border-violet-200/80 bg-violet-100 text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/30 dark:text-violet-200",
  slate: "border-border/60 bg-muted/60 text-foreground",
};

const chipClass = (tone: ChipTone) => cn(chipBaseClass, toneClasses[tone]);

const sectionTitleClass = "text-[13px] font-semibold leading-tight text-foreground";
const sectionSubtitleClass = "text-[12px] leading-snug text-muted-foreground";
const bulletTextClass = "text-[13px] leading-relaxed text-foreground/90";
const mutedBulletClass = "text-[12px] leading-relaxed text-muted-foreground";
const miniLabelClass = "text-[12px] font-semibold leading-tight text-foreground/90";
const metadataClass =
  "text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

const tierIconFor = (tier: MoatTier) => {
  switch (tier) {
    case "strong":
      return ArrowUp;
    case "mid":
      return Minus;
    case "weak":
      return ArrowDown;
  }
};

const barrierStrengthLabel = (
  strength: V15Gatekeeper["barrier_strength"],
) => {
  switch (strength) {
    case "strong":
      return { label: "Strong", tone: "emerald" as const };
    case "moderate":
      return { label: "Moderate", tone: "sky" as const };
    case "weak":
      return { label: "Weak", tone: "amber" as const };
    case "none":
      return { label: "None", tone: "rose" as const };
    default:
      return { label: strength, tone: "slate" as const };
  }
};

// Render a list of atomic bullets (one of the 8 v15 array fields). Each
// bullet is one short claim ≤25 words; render as a tight disc list.
const BulletList = ({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) => (
  <ul className={cn("list-disc space-y-1.5 pl-5", className)}>
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const SourceEvidenceRow = ({
  icon: Icon,
  iconClassName,
  label,
  items,
}: {
  icon: typeof ShieldCheck;
  iconClassName: string;
  label: string;
  items: readonly string[] | null;
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex items-start gap-2">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", iconClassName)} />
      <div className="min-w-0 space-y-1">
        <p className={miniLabelClass}>{label}</p>
        <BulletList items={items} className={bulletTextClass} />
      </div>
    </div>
  );
};

// Render a single source card (presence + durability).
const SourceCard = ({ source }: { source: V15Source }) => {
  const hasPresence = Boolean(source.presence?.length);
  const hasDurability = Boolean(source.durability?.length);

  return (
    <div className={cn(nestedDetailClass, "overflow-hidden")}>
      <div className="h-1.5 bg-emerald-500/75" />
      <div className="flex flex-wrap items-start justify-between gap-2 p-3 pb-0">
        <div className="min-w-0 space-y-1">
          <p className="text-[13px] font-semibold leading-snug text-foreground">
            {source.source_type}
          </p>
          {source.subcategory && (
            <span className={chipClass("slate")}>{source.subcategory}</span>
          )}
        </div>
        <span className={chipClass("emerald")}>Applies</span>
      </div>

      <div className="space-y-2.5 p-3">
        <SourceEvidenceRow
          icon={ShieldCheck}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          label="Presence"
          items={source.presence}
        />
        <SourceEvidenceRow
          icon={Clock}
          iconClassName="text-sky-600 dark:text-sky-400"
          label="Durability"
          items={source.durability}
        />
        {!hasPresence && !hasDurability && (
          <p className={cn(mutedBulletClass, "italic")}>
            Evidence missing for applicable source.
          </p>
        )}
      </div>
    </div>
  );
};

// Render the deprecated/missing schema notice — used when payload doesn't
// validate against v15.
const SchemaNotice = ({
  status,
  generatedAtShort,
}: {
  status: "deprecated" | "missing";
  generatedAtShort: string | null;
}) => {
  const message =
    status === "deprecated"
      ? "Assessment uses a deprecated schema. Regenerate with the v15 conversational pipeline to view the full moat breakdown."
      : "No assessment payload available. Regenerate with the v15 conversational pipeline to view the full moat breakdown.";
  return (
    <div className={cn(elevatedBlockClass, "p-4")}>
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 space-y-1">
          <p className={sectionTitleClass}>Schema mismatch</p>
          <p className={mutedBulletClass}>{message}</p>
          {generatedAtShort && (
            <p className={metadataClass}>Last generated {generatedAtShort}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export function MoatAnalysisSection({
  analysis,
  generatedAtShort,
}: MoatAnalysisSectionProps) {
  const { payload, schemaStatus } = analysis;

  // Render the badge row regardless of payload status — it's derived from
  // promoted DB columns. The detail block falls back to a notice when
  // payload is missing/deprecated.
  const tierIcon = analysis.moatTier ? tierIconFor(analysis.moatTier) : null;
  const TierIcon = tierIcon;

  // Hero card — always renders with badges.
  const heroCard = (
    <div className={cn(elevatedBlockClass, "space-y-2.5 p-4")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            chipBaseClass,
            moatTierClass(analysis.moatRating),
            "px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.1em]",
          )}
        >
          {analysis.moatRatingLabel}
        </span>
        {analysis.moatTier && TierIcon && (
          <span
            className={cn(
              chipBaseClass,
              moatTierGradeClass(),
              "gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]",
            )}
          >
            <TierIcon
              className={cn("h-3 w-3", moatTierGradeIconClass(analysis.moatTier))}
            />
            {moatTierGradeLabel(analysis.moatTier)}
          </span>
        )}
      </div>

      {payload?.headline && (
        <p className="max-w-4xl text-[15px] font-medium leading-relaxed text-foreground">
          {payload.headline}
        </p>
      )}
    </div>
  );

  if (!payload) {
    return (
      <div className="space-y-4">
        {heroCard}
        <SchemaNotice status={schemaStatus as "deprecated" | "missing"} generatedAtShort={generatedAtShort} />
      </div>
    );
  }

  // ---- v15 detail rendering ----

  const appliesSources = payload.sources.filter((s) => s.applies);
  const ruledOutSources = payload.sources.filter((s) => !s.applies);
  const moreEvidenceMetadata = [
    generatedAtShort ? `Generated ${generatedAtShort}` : null,
    analysis.assessmentVersion ? `Schema ${analysis.assessmentVersion}` : null,
  ].filter(Boolean);
  const hasMoreEvidence =
    payload.why_this_tier.length > 0 ||
    payload.what_would_change_the_call.length > 0 ||
    payload.financial_check.data_limitations.length > 0 ||
    moreEvidenceMetadata.length > 0;

  return (
    <div className="space-y-4">
      {heroCard}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Economic proof */}
        <div className={cn(elevatedBlockClass, "p-4 space-y-3")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className={sectionTitleClass}>Economic Proof</p>
              <p className={sectionSubtitleClass}>
                Whether multi-year returns support the moat call.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={chipClass("violet")}>{payload.step_0.posture}</span>
              <span
                className={chipClass(
                  payload.financial_check.cycle_tested ? "emerald" : "rose",
                )}
              >
                Cycle-tested · {payload.financial_check.cycle_tested ? "Yes" : "No"}
              </span>
              <span className={chipClass("slate")}>
                {payload.step_0.tier_anchor_phrase}
              </span>
            </div>
          </div>

          <p className="text-[14px] font-medium leading-relaxed text-foreground">
            {payload.step_0.headline}
          </p>

          <details className={cn(dashedDetailClass, "group/economic-proof overflow-hidden")}>
            <summary className="list-none cursor-pointer select-none px-3 py-2 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={miniLabelClass}>Evidence</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] font-medium text-muted-foreground group-open/economic-proof:hidden">
                    Show details
                  </span>
                  <span className="hidden text-[12px] font-medium text-muted-foreground group-open/economic-proof:inline">
                    Hide details
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/economic-proof:rotate-180" />
                </div>
              </div>
            </summary>
            <div className="border-t border-border/25 px-3 py-2.5">
              <BulletList items={payload.step_0.evidence} className={bulletTextClass} />
            </div>
          </details>
        </div>

        {/* Gatekeeper */}
        <div className={cn(elevatedBlockClass, "p-4 space-y-2.5")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className={sectionTitleClass}>Gatekeeper</p>
              <p className={sectionSubtitleClass}>
                Could a well-funded attacker replicate the moat in a decade?
              </p>
            </div>
            {(() => {
              const verdict = barrierStrengthLabel(payload.gatekeeper.barrier_strength);
              return (
                <span className={chipClass(verdict.tone)}>Barrier · {verdict.label}</span>
              );
            })()}
          </div>
          <p className={cn(bulletTextClass, "text-[13.5px]")}>
            {payload.gatekeeper.rationale}
          </p>
          <div className="space-y-1.5">
            <p className={miniLabelClass}>Credible attackers</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {payload.gatekeeper.attackers.map((attacker, i) => (
                <span key={i} className={chipClass("slate")}>
                  {attacker}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Moat sources */}
      <div className={cn(elevatedBlockClass, "p-3 space-y-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className={sectionTitleClass}>Moat sources</p>
            <p className={sectionSubtitleClass}>
              {appliesSources.length} applies
              {ruledOutSources.length > 0 ? ` · ${ruledOutSources.length} ruled out` : ""}
            </p>
          </div>
        </div>

        {appliesSources.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {appliesSources.map((source) => (
              <SourceCard key={source.source_type} source={source} />
            ))}
          </div>
        ) : (
          <div className={cn(dashedDetailClass, "p-3 text-[12px] text-muted-foreground")}>
            All four moat sources were considered and ruled out — this is a
            genuinely undifferentiated business.
          </div>
        )}

        {ruledOutSources.length > 0 && (
          <details className={cn(dashedDetailClass, "group/ruled-out overflow-hidden")}>
            <summary className="list-none cursor-pointer select-none p-3 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className={miniLabelClass}>Also considered</p>
                  <p className={sectionSubtitleClass}>
                    {ruledOutSources.length} source
                    {ruledOutSources.length === 1 ? "" : "s"} ruled out.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] font-medium text-muted-foreground group-open/ruled-out:hidden">
                    Show details
                  </span>
                  <span className="hidden text-[12px] font-medium text-muted-foreground group-open/ruled-out:inline">
                    Hide details
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/ruled-out:rotate-180" />
                </div>
              </div>
            </summary>
            <ul className="space-y-2">
              {ruledOutSources.map((source) => (
                <li
                  key={source.source_type}
                  className="border-t border-border/25 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[12px] font-semibold text-foreground/85">
                      {source.source_type}
                    </p>
                    {source.subcategory && (
                      <span className={chipClass("slate")}>{source.subcategory}</span>
                    )}
                  </div>
                  {source.does_not_apply_reason ? (
                    <p className={cn(mutedBulletClass, "mt-1.5")}>
                      {source.does_not_apply_reason}
                    </p>
                  ) : (
                    <p className={cn(mutedBulletClass, "mt-1.5 italic")}>
                      No rationale captured.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {hasMoreEvidence && (
        <details className={cn(elevatedBlockClass, "group/moat-more overflow-hidden")}>
          <summary className="list-none cursor-pointer select-none p-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className={sectionTitleClass}>More evidence</p>
                <p className={sectionSubtitleClass}>
                  Tier rationale, change triggers, limits of evidence, and metadata.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {payload.what_would_change_the_call.length > 0 && (
                  <span className={chipClass("slate")}>
                    {payload.what_would_change_the_call.length} trigger
                    {payload.what_would_change_the_call.length === 1 ? "" : "s"}
                  </span>
                )}
                <span className="text-[12px] font-medium text-muted-foreground group-open/moat-more:hidden">
                  Show details
                </span>
                <span className="hidden text-[12px] font-medium text-muted-foreground group-open/moat-more:inline">
                  Hide details
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/moat-more:rotate-180" />
              </div>
            </div>
          </summary>
          <div className="space-y-4 border-t border-border/40 p-4 pt-3">
            {payload.why_this_tier.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                  <div className="space-y-0.5">
                    <p className={sectionTitleClass}>Why this tier</p>
                    <p className={sectionSubtitleClass}>
                      Why the call sits at this tier and not the next one.
                    </p>
                  </div>
                </div>
                <BulletList items={payload.why_this_tier} className={bulletTextClass} />
              </div>
            )}

            {payload.what_would_change_the_call.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                  <div className="space-y-0.5">
                    <p className={sectionTitleClass}>What would change the call</p>
                    <p className={sectionSubtitleClass}>
                      Observable upgrade and downgrade triggers.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {payload.what_would_change_the_call.map((trigger, i) => (
                    <li
                      key={i}
                      className={cn(
                        nestedDetailClass,
                        "p-3 text-[13px] leading-relaxed text-foreground/90",
                      )}
                    >
                      {trigger}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {payload.financial_check.data_limitations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5">
                    <p className={sectionTitleClass}>Limits of evidence</p>
                    <p className={sectionSubtitleClass}>
                      Known gaps in the source base or financial record.
                    </p>
                  </div>
                </div>
                <BulletList
                  items={payload.financial_check.data_limitations}
                  className={mutedBulletClass}
                />
              </div>
            )}

            {moreEvidenceMetadata.length > 0 && (
              <p className={metadataClass}>{moreEvidenceMetadata.join(" · ")}</p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
