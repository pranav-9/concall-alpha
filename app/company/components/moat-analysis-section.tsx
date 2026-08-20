// L1 SectionCard shell is provided externally by MoatAnalysisPanel in
// company-detail-sections.tsx. This component renders the section interior
// only. (Same pattern as KeyVariablesPanel; differs from FutureGrowthSection,
// which owns its own SectionCard.)
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Clock,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

import { chipClass } from "./chip-tone";
import type { ChipTone } from "./chip-tone";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import type {
  MoatRatingKey,
  MoatTier,
  NormalizedMoatAnalysis,
  V15Gatekeeper,
  V15Source,
} from "@/lib/moat-analysis/types";
import { cn } from "@/lib/utils";

type MoatAnalysisSectionProps = {
  analysis: NormalizedMoatAnalysis;
  generatedAtShort: string | null;
};

// Mirrors SECTION_TONE_BY_ID["moat-analysis"] = "emerald" in section-card.tsx.
// If the section tone changes there, update this too.
const sourceCardAccentClass = "bg-emerald-500/75";

const sectionTitleClass = "text-[13px] font-semibold leading-tight text-foreground";
const sectionSubtitleClass = "text-[12px] leading-snug text-muted-foreground";
const bulletTextClass = "text-sm leading-relaxed lg:text-[13px] text-foreground/90";
const mutedBulletClass = "text-[13px] leading-relaxed lg:text-[12px] text-muted-foreground";
const miniLabelClass = "text-[12px] font-semibold leading-tight text-foreground/90";
const metadataClass =
  "text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

// ---------------------------------------------------------------------------
// Plain-language maps. These translate the stored framework enums into
// retail-first copy. They are static (rating/tier/source_type/subcategory are
// controlled vocabularies) — no stored prose is invented here. Company-specific
// per-source one-liners and per-source strength come from a later pipeline
// upgrade (Phase 2); until then the advantages table shows a generic true
// description of each advantage type.
// ---------------------------------------------------------------------------

// The one-line verdict phrase, from (rating, tier). Trajectory intentionally
// omitted — no history is stored, so we never claim "widening" / "was weaker".
const edgePhrase = (rating: MoatRatingKey, tier: MoatTier | null): string => {
  switch (rating) {
    case "no_moat":
      return "No real edge";
    case "moat_at_risk":
      return "Edge under threat";
    case "wide_moat":
      return tier === "strong" ? "Wide, well-protected edge" : "Wide edge";
    case "narrow_moat":
      if (tier === "strong") return "Solid, defensible edge";
      if (tier === "weak") return "Slim edge";
      return "Moderate edge";
    default:
      return "Edge unclear";
  }
};

// The plain sentence under the phrase — naturally worded per rating/tier so we
// never have to glue an article onto the phrase.
const verdictSentence = (
  rating: MoatRatingKey,
  tier: MoatTier | null,
  name: string,
): string => {
  switch (rating) {
    case "no_moat":
      return `${name} has little that stops rivals from competing away its profits.`;
    case "moat_at_risk":
      return `${name} had an edge, but it is now under real threat.`;
    case "wide_moat":
      return `${name} has a strong, hard-to-attack advantage over rivals.`;
    case "narrow_moat":
      if (tier === "strong")
        return `${name} has a real and fairly durable advantage over rivals.`;
      if (tier === "weak") return `${name} has only a slim advantage over rivals.`;
      return `${name} has a real but moderate advantage over rivals.`;
    default:
      return `${name}'s competitive advantage is not clear yet.`;
  }
};

const NUM_WORDS = ["zero", "one", "two", "three", "four"] as const;
const numWord = (n: number): string => NUM_WORDS[n] ?? String(n);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// "Two things protect it; two common advantages don't apply." — derived purely
// from the applies/ruled-out counts (both real).
const countsSentence = (applies: number, ruled: number): string => {
  if (applies === 0) {
    return "None of the four common advantages apply here.";
  }
  const head = `${cap(numWord(applies))} ${
    applies === 1 ? "thing protects" : "things protect"
  } it`;
  if (ruled === 0) return `${head}.`;
  return `${head}; ${numWord(ruled)} common ${
    ruled === 1 ? "advantage doesn't" : "advantages don't"
  } apply.`;
};

// Plain name for each of the 4 moat sources (refined by subcategory where it
// changes the plain meaning).
const advantageLabel = (
  type: V15Source["source_type"],
  sub: V15Source["subcategory"],
): string => {
  switch (type) {
    case "Switching Costs":
      return "Hard to switch away";
    case "Cost Advantages":
      return "Lower cost to produce";
    case "Network Effects":
      return "Network effects";
    case "Intangible Assets":
      if (sub === "Patent") return "Protected by patents";
      if (sub === "Regulatory licence") return "Licence protection";
      if (sub === "Brand") return "Brand power";
      return "Brand & reputation";
    default:
      return type;
  }
};

// Generic, true description of the advantage TYPE (not a company-specific
// claim). Phase 2 replaces this with the pipeline's per-company lay one-liner.
const advantageMeaning = (
  type: V15Source["source_type"],
  sub: V15Source["subcategory"],
): string => {
  switch (type) {
    case "Switching Costs":
      return "Customers face real cost or disruption to move to a rival.";
    case "Cost Advantages":
      return "It can make the same product for less than competitors.";
    case "Network Effects":
      return "The product gets more useful as more people use it.";
    case "Intangible Assets":
      if (sub === "Patent") return "Patents legally block rivals from copying it.";
      if (sub === "Regulatory licence")
        return "Licences or approvals keep most rivals out.";
      if (sub === "Brand") return "A trusted brand lets it charge more or win buyers.";
      return "Reputation and know-how are hard for rivals to match.";
    default:
      return "A real advantage that is hard for rivals to copy.";
  }
};

// The "Will the edge last?" verdict, from the two durability inputs (both real).
const durabilityRead = (
  cycleTested: boolean,
  barrier: V15Gatekeeper["barrier_strength"],
): { word: string; tone: ChipTone } => {
  if (barrier === "none") return { word: "Unlikely", tone: "rose" };
  if (barrier === "weak" || !cycleTested) return { word: "Mixed", tone: "amber" };
  return { word: "Likely", tone: "emerald" };
};

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

const STRENGTH_SEGMENTS = [
  { idx: 1, label: "Weak" },
  { idx: 2, label: "Moderate" },
  { idx: 3, label: "Strong" },
] as const;

const StrengthMeter = ({ tier }: { tier: MoatTier }) => {
  const level = tier === "strong" ? 3 : tier === "mid" ? 2 : 1;
  return (
    <div className="space-y-1.5">
      <p className={metadataClass}>How strong</p>
      <div className="grid w-[150px] grid-cols-3 gap-1.5">
        {STRENGTH_SEGMENTS.map((s) => (
          <div key={s.idx} className="space-y-1">
            <span
              className={cn(
                "block h-1.5 rounded-full",
                s.idx <= level ? "bg-emerald-500" : "bg-muted",
              )}
            />
            <span
              className={cn(
                "block text-center text-[10px]",
                s.idx === level
                  ? "font-semibold text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

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

// Detailed per-source card (presence + durability) — lives inside the "Full
// analysis" drawer, for readers who want the raw evidence.
const SourceCard = ({ source }: { source: V15Source }) => {
  const hasPresence = Boolean(source.presence?.length);
  const hasDurability = Boolean(source.durability?.length);

  return (
    <div className={cn(nestedDetailClass, "overflow-hidden")}>
      <div className={cn("h-1.5", sourceCardAccentClass)} />
      <div className="flex flex-wrap items-start justify-between gap-2 p-3 pb-0">
        <div className="min-w-0 space-y-1">
          <p className="text-[13px] font-semibold leading-snug text-foreground">
            {advantageLabel(source.source_type, source.subcategory)}
          </p>
          {source.subcategory && (
            <span className={chipClass("slate")}>{source.subcategory}</span>
          )}
        </div>
      </div>

      <div className="space-y-2 p-3">
        <SourceEvidenceRow
          icon={ShieldCheck}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          label="Evidence it's real"
          items={source.presence}
        />
        <SourceEvidenceRow
          icon={Clock}
          iconClassName="text-sky-600 dark:text-sky-400"
          label="Evidence it lasts"
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

// Deprecated/missing payload notice.
const SchemaNotice = ({
  status,
  generatedAtShort,
}: {
  status: "deprecated" | "missing";
  generatedAtShort: string | null;
}) => {
  const message =
    status === "deprecated"
      ? "This moat read is being refreshed to our latest format. The full breakdown will be back shortly."
      : "We haven't published a moat read for this company yet.";
  const title = status === "deprecated" ? "Being refreshed" : "Not available yet";
  return (
    <div className={cn(elevatedBlockClass, "p-4")}>
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 space-y-1">
          <p className={sectionTitleClass}>{title}</p>
          <p className={mutedBulletClass}>{message}</p>
          {generatedAtShort && (
            <p className={metadataClass}>Last generated {generatedAtShort}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function MoatAnalysisSection({
  analysis,
  generatedAtShort,
}: MoatAnalysisSectionProps) {
  const { payload, schemaStatus } = analysis;
  const name = payload?.name ?? analysis.companyName ?? "This company";

  // Verdict header — renders from promoted columns (rating/tier), so it works
  // even when the detailed payload is missing/deprecated. Counts are added only
  // when the payload is present.
  const appliesCount = payload
    ? payload.sources.filter((s) => s.applies).length
    : null;
  const ruledOutCount = payload
    ? payload.sources.filter((s) => !s.applies).length
    : null;

  const verdictHeader = (
    <div className={cn(elevatedBlockClass, "p-4 sm:p-5")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-2xl font-bold leading-tight text-foreground sm:text-[26px]">
            {edgePhrase(analysis.moatRating, analysis.moatTier)}
          </p>
          <div className="max-w-xl space-y-1">
            {/* Real per-company one-liner (payload.headline) when we have it;
                the (rating, tier) template is only a fallback for the
                missing/deprecated-payload path. */}
            <p className="text-sm leading-snug text-foreground/90 lg:text-[13.5px]">
              {payload?.headline ??
                verdictSentence(analysis.moatRating, analysis.moatTier, name)}
            </p>
            {appliesCount != null && ruledOutCount != null && (
              <p className={cn(sectionSubtitleClass, "text-[12px]")}>
                {countsSentence(appliesCount, ruledOutCount)}
              </p>
            )}
          </div>
        </div>
        {analysis.moatTier && (
          <div className="shrink-0">
            <StrengthMeter tier={analysis.moatTier} />
          </div>
        )}
      </div>
    </div>
  );

  if (!payload) {
    return (
      <div className="space-y-4">
        {verdictHeader}
        <SchemaNotice
          status={schemaStatus as "deprecated" | "missing"}
          generatedAtShort={generatedAtShort}
        />
      </div>
    );
  }

  // ---- v15 detail rendering ----

  const orderedSources: V15Source[] = [
    ...payload.sources.filter((s) => s.applies),
    ...payload.sources.filter((s) => !s.applies),
  ];
  const appliesSources = payload.sources.filter((s) => s.applies);

  const durability = durabilityRead(
    payload.financial_check.cycle_tested,
    payload.gatekeeper.barrier_strength,
  );
  const provenPart = payload.financial_check.cycle_tested
    ? "Proven in the numbers"
    : "Not yet proven in the numbers";
  const copyPart =
    payload.gatekeeper.barrier_strength === "strong" ||
    payload.gatekeeper.barrier_strength === "moderate"
      ? "hard to copy quickly"
      : "easier to copy";
  const provenCardTitle = payload.financial_check.cycle_tested
    ? "Proven in the numbers"
    : "Not yet proven";
  const copyCardTitle =
    payload.gatekeeper.barrier_strength === "strong" ||
    payload.gatekeeper.barrier_strength === "moderate"
      ? "Hard to copy fast"
      : "Easier to copy";

  return (
    <div className="space-y-4">
      {verdictHeader}

      {/* Advantages table — all four sources, applies first, ruled out greyed.
          Per-source strength (the ●●○ dots) and company-specific one-liners land
          in the Phase 2 pipeline upgrade. */}
      <div className={cn(elevatedBlockClass, "overflow-hidden")}>
        <div className="hidden grid-cols-[minmax(150px,220px)_1fr] gap-4 border-b border-border/50 px-4 py-2.5 md:grid">
          <p className={metadataClass}>Advantage</p>
          <p className={metadataClass}>What it means</p>
        </div>
        <div className="divide-y divide-border/40">
          {orderedSources.map((source) => (
            <div
              key={source.source_type}
              className="grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-[minmax(150px,220px)_1fr] md:gap-4"
            >
              <p
                className={cn(
                  "text-sm font-semibold leading-snug",
                  source.applies ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {advantageLabel(source.source_type, source.subcategory)}
              </p>
              <p
                className={cn(
                  "text-sm leading-relaxed lg:text-[13px]",
                  source.applies ? "text-foreground/90" : "text-muted-foreground/70",
                )}
              >
                {source.applies
                  ? // Real per-company evidence (the lead presence claim);
                    // fall back to the generic type description only if the
                    // payload left presence empty.
                    source.presence?.[0] ??
                    advantageMeaning(source.source_type, source.subcategory)
                  : source.does_not_apply_reason ||
                    "Not a factor for this kind of business."}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Will the edge last? */}
      <div className={cn(elevatedBlockClass, "p-4 sm:p-5 space-y-3")}>
        <div className="space-y-1">
          <p className="text-lg font-bold leading-tight text-foreground">
            Will the edge last?
          </p>
          <p className="text-sm leading-snug">
            <span
              className={cn(
                "font-semibold",
                durability.tone === "emerald" &&
                  "text-emerald-600 dark:text-emerald-400",
                durability.tone === "amber" && "text-amber-600 dark:text-amber-400",
                durability.tone === "rose" && "text-rose-600 dark:text-rose-400",
              )}
            >
              {durability.word}.
            </span>{" "}
            <span className="text-muted-foreground">
              {provenPart}, and {copyPart}.
            </span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className={cn(nestedDetailClass, "p-3 space-y-1.5")}>
            <p className={metadataClass}>{provenCardTitle}</p>
            <p className={bulletTextClass}>{payload.step_0.headline}</p>
          </div>
          <div className={cn(nestedDetailClass, "p-3 space-y-1.5")}>
            <p className={metadataClass}>{copyCardTitle}</p>
            <p className={bulletTextClass}>{payload.gatekeeper.rationale}</p>
          </div>
        </div>
      </div>

      {/* Full analysis — the dense evidence, one collapse. */}
      <details className={cn(elevatedBlockClass, "group/moat-full overflow-hidden")}>
        <summary className="list-none cursor-pointer select-none p-4 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p className={sectionTitleClass}>Full analysis</p>
              <p className={sectionSubtitleClass}>
                The evidence behind each advantage, why the rating sits here, what
                would change it, and the limits.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[12px] font-medium text-muted-foreground group-open/moat-full:hidden">
                Show details
              </span>
              <span className="hidden text-[12px] font-medium text-muted-foreground group-open/moat-full:inline">
                Hide details
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/moat-full:rotate-180" />
            </div>
          </div>
        </summary>
        <div className="space-y-4 border-t border-border/40 p-4 pt-3">
          {appliesSources.length > 0 && (
            <div className="space-y-2">
              <p className={sectionTitleClass}>Evidence for each advantage</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {appliesSources.map((source) => (
                  <SourceCard key={source.source_type} source={source} />
                ))}
              </div>
            </div>
          )}

          {payload.why_this_tier.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                <div className="space-y-0.5">
                  <p className={sectionTitleClass}>Why this rating</p>
                  <p className={sectionSubtitleClass}>
                    Why the call sits here and not one notch higher or lower.
                  </p>
                </div>
              </div>
              <BulletList items={payload.why_this_tier} className={bulletTextClass} />
            </div>
          )}

          {payload.what_would_change_the_call.length > 0 && (
            <div className="space-y-2">
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
                      "p-3 text-sm leading-relaxed lg:text-[13px] text-foreground/90",
                    )}
                  >
                    {trigger}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {payload.gatekeeper.attackers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                <div className="space-y-0.5">
                  <p className={sectionTitleClass}>Who could challenge it</p>
                  <p className={sectionSubtitleClass}>
                    The most credible would-be attackers.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {payload.gatekeeper.attackers.map((attacker, i) => (
                  <span key={i} className={chipClass("slate")}>
                    {attacker}
                  </span>
                ))}
              </div>
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

          {generatedAtShort && (
            <p className={metadataClass}>Generated {generatedAtShort}</p>
          )}
        </div>
      </details>
    </div>
  );
}
