// The Moat card of the Quality tab (quality-section.tsx supplies the L1
// SectionCard shell; this renders the interior). One block: the outcome on the
// left, the four advantages on the right, and the full analysis behind a
// collapsed <details>. Plain-language maps below translate the stored
// framework enums; nothing here invents data the v15 payload does not carry.
import { AlertCircle, AlertTriangle, ChevronDown, Clock, ShieldCheck } from "lucide-react";

import { chipClass } from "./chip-tone";
import { edgePhrase } from "@/lib/moat-analysis/plain-language";
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
  /** Put the sign-up gate's cut on the Full-analysis block (see quality-section.tsx). */
  gateCut?: boolean;
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
// edgePhrase lives in lib/moat-analysis/plain-language.ts (shared with the overview).

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

const MiniCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className={cn(nestedDetailClass, "flex flex-col gap-1.5 px-4 py-3.5")}>
    <p className={metadataClass}>{title}</p>
    {children}
  </div>
);

export function MoatAnalysisSection({
  analysis,
  generatedAtShort,
  gateCut = false,
}: MoatAnalysisSectionProps) {
  const { payload, schemaStatus } = analysis;
  const name = payload?.name ?? analysis.companyName ?? "This company";

  // Outcome column — renders from promoted columns (rating/tier), so it works
  // even when the detailed payload is missing/deprecated. Counts are added only
  // when the payload is present.
  const appliesCount = payload ? payload.sources.filter((s) => s.applies).length : null;
  const ruledOutCount = payload ? payload.sources.filter((s) => !s.applies).length : null;

  const outcome = (
    <div className="flex flex-col gap-2.5 p-5 sm:px-6 md:border-r md:border-border">
      <p className={cn(metadataClass, "font-semibold tracking-[0.16em]")}>Outcome</p>
      <p className="[font-family:var(--font-display)] text-[26px] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
        {edgePhrase(analysis.moatRating, analysis.moatTier)}
      </p>
      {/* Real per-company one-liner (payload.headline) when we have it; the
          (rating, tier) template is only a fallback for the missing/deprecated path. */}
      <p className="text-[13.5px] leading-normal text-foreground/90 [text-wrap:pretty]">
        {payload?.headline ?? verdictSentence(analysis.moatRating, analysis.moatTier, name)}
      </p>
      {appliesCount != null && ruledOutCount != null && (
        <p className="text-[12px] leading-snug text-muted-foreground">
          {countsSentence(appliesCount, ruledOutCount)}
        </p>
      )}
      {analysis.moatTier && (
        <div className="mt-auto pt-2.5">
          <StrengthMeter tier={analysis.moatTier} />
        </div>
      )}
    </div>
  );

  if (!payload) {
    return (
      <div className="space-y-4">
        <div className={cn(elevatedBlockClass, "overflow-hidden")}>{outcome}</div>
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

  return (
    <div className={cn(elevatedBlockClass, "overflow-hidden")}>
      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr]">
        {outcome}

        {/* Advantages table — all four sources, applies first, ruled out greyed.
            Per-source strength dots land with the Phase 2 pipeline upgrade. */}
        <div className="flex flex-col border-t border-border md:border-t-0">
          <div className="hidden grid-cols-[200px_1fr] gap-4 border-b border-border/50 px-5 py-2.5 md:grid">
            <p className={metadataClass}>Advantage</p>
            <p className={metadataClass}>Why</p>
          </div>
          <div className="divide-y divide-border/40">
            {orderedSources.map((source) => (
              <div
                key={source.source_type}
                className="grid grid-cols-1 gap-1 px-5 py-3 md:grid-cols-[200px_1fr] md:gap-4"
              >
                <p
                  className={cn(
                    "flex items-center gap-2 text-sm font-semibold leading-snug",
                    source.applies ? "text-foreground" : "text-muted-foreground/75",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-[7px] w-[7px] shrink-0 rounded-full",
                      source.applies ? "bg-emerald-500" : "border border-muted-foreground/50",
                    )}
                  />
                  {advantageLabel(source.source_type, source.subcategory)}
                </p>
                <p
                  className={cn(
                    "text-[13px] leading-normal",
                    source.applies ? "text-foreground/90" : "text-muted-foreground/75",
                  )}
                >
                  {source.applies
                    ? // Real per-company evidence (the lead presence claim); the
                      // generic type description only if presence is empty.
                      source.presence?.[0] ??
                      advantageMeaning(source.source_type, source.subcategory)
                    : source.does_not_apply_reason || "Not a factor for this kind of business."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full analysis — the dense evidence, one collapse (native details). */}
      <details className="group/moat-full border-t border-border" data-gate-cut={gateCut || undefined}>
        <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-muted/35 [&::-webkit-details-marker]:hidden">
          <span className={sectionTitleClass}>Full analysis</span>
          <span className="flex shrink-0 items-center gap-2 text-[12px] font-medium text-muted-foreground">
            <span className="group-open/moat-full:hidden">Show details</span>
            <span className="hidden group-open/moat-full:inline">Hide details</span>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 ease-out group-open/moat-full:rotate-180" />
          </span>
        </summary>
        <div className="space-y-4 px-5 pb-5 pt-1">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <MiniCard title="Will the edge last?">
              <p className="text-[13px] leading-normal">
                <span
                  className={cn(
                    "font-semibold",
                    durability.tone === "emerald" && "text-emerald-600 dark:text-emerald-400",
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
              <p className={mutedBulletClass}>{payload.step_0.headline}</p>
              <p className={mutedBulletClass}>{payload.gatekeeper.rationale}</p>
            </MiniCard>
            <MiniCard title="Who could challenge it">
              {payload.gatekeeper.attackers.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {payload.gatekeeper.attackers.map((attacker, i) => (
                    <span key={i} className={chipClass("slate")}>
                      {attacker}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={mutedBulletClass}>No credible attacker named.</p>
              )}
            </MiniCard>
            <MiniCard title="Why this rating">
              <BulletList items={payload.why_this_tier} className={bulletTextClass} />
            </MiniCard>
            <MiniCard title="What would change the call">
              <BulletList items={payload.what_would_change_the_call} className={bulletTextClass} />
            </MiniCard>
          </div>

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

          {generatedAtShort && <p className={metadataClass}>Generated {generatedAtShort}</p>}
        </div>
      </details>
    </div>
  );
}
