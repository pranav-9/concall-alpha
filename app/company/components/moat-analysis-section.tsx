import { AlertTriangle, ArrowDown, ArrowUp, Clock, Minus, ShieldCheck } from "lucide-react";

import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import {
  moatTierClass,
  moatTierGradeClass,
  moatTierGradeIconClass,
  moatTierGradeLabel,
} from "@/lib/moat-analysis/tier-class";
import type { MoatTier, NormalizedMoatAnalysis } from "@/lib/moat-analysis/types";
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
const bodyTextClass = "text-[13px] leading-relaxed text-foreground/90";
const mutedBodyClass = "text-[12px] leading-relaxed text-muted-foreground";
const miniLabelClass = "text-[12px] font-semibold leading-tight text-foreground/90";
const metadataClass =
  "text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

const formatVersionLabel = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^moat_assessment_/i, "").replace(/_/g, ".");
};

const splitLeadSentence = (text: string | null): { lead: string | null; rest: string | null } => {
  if (!text) return { lead: null, rest: null };
  const trimmed = text.trim();
  const match = /^([\s\S]*?[.!?])(\s+)([\s\S]+)$/.exec(trimmed);
  if (!match) return { lead: trimmed, rest: null };
  return { lead: match[1], rest: match[3] };
};

const renderBulletedProse = (text: string, className: string) => {
  const trimmed = text.trim();
  if (/^[-•*]\s/.test(trimmed)) {
    const parts = trimmed
      .replace(/^[-•*]\s+/, "")
      .split(/\s*\n\s*[-•*]\s+|\s+[-•*]\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return (
        <ul className={cn(className, "list-disc space-y-1 pl-5")}>
          {parts.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      );
    }
  }
  return <p className={className}>{text}</p>;
};

type BarrierVerdict = { label: string; tone: ChipTone };

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

const gatekeeperToBarrier = (answer: string | null): BarrierVerdict | null => {
  const normalized = (answer ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized === "clearly_no") return { label: "Strong", tone: "emerald" };
  if (normalized.startsWith("probably_not")) return { label: "Moderate", tone: "sky" };
  if (normalized.startsWith("probably_yes")) return { label: "Weak", tone: "amber" };
  if (normalized === "clearly_yes") return { label: "None", tone: "rose" };
  return { label: normalized.replace(/_/g, " "), tone: "slate" };
};

export function MoatAnalysisSection({ analysis, generatedAtShort }: MoatAnalysisSectionProps) {
  const appliesSources = analysis.sources.filter((source) => source.applies);
  const ruledOutSources = analysis.sources.filter((source) => !source.applies);

  const versionLabel = formatVersionLabel(analysis.assessmentVersion ?? analysis.schemaVersion);
  const gatekeeper = analysis.gatekeeper;
  const barrierVerdict = gatekeeperToBarrier(gatekeeper?.answer ?? null);
  const financial = analysis.financialCheck;

  const { lead, rest } = splitLeadSentence(analysis.reasoning);

  const cycleChip =
    analysis.cycleTested == null
      ? null
      : analysis.cycleTested
        ? { label: "Cycle-proven", tone: "emerald" as const }
        : { label: "Cycle-untested", tone: "amber" as const };

  const emptySourcesCopy =
    analysis.moatRating === "no_moat"
      ? "All moat sources were considered and ruled out — this is a genuinely undifferentiated business."
      : "No qualifying moat sources found.";

  const triggerCount = analysis.whatWouldChangeTheCall.length;

  const footerBits = [
    generatedAtShort ? `Generated ${generatedAtShort}` : null,
    versionLabel ? `v${versionLabel}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className={`${elevatedBlockClass} space-y-2 p-4`}>
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
          {analysis.moatTier && (() => {
            const TierIcon = tierIconFor(analysis.moatTier);
            return (
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
            );
          })()}
          {analysis.industry && <span className={chipClass("slate")}>{analysis.industry}</span>}
          {cycleChip && <span className={chipClass(cycleChip.tone)}>{cycleChip.label}</span>}
        </div>

        {(lead || rest) && (
          <p className="max-w-4xl text-[14px] leading-relaxed text-foreground">
            {lead && <span className="font-semibold">{lead}</span>}
            {lead && rest ? " " : null}
            {rest && <span className="text-foreground/85">{rest}</span>}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className={`${elevatedBlockClass} p-3 space-y-3`}>
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
              {appliesSources.map((source, index) => (
                <div
                  key={`${source.sourceType}-${index}`}
                  className={`${nestedDetailClass} p-3`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-foreground">
                          {source.sourceType}
                        </p>
                        {index === 0 && appliesSources.length > 1 && (
                          <span className={chipClass("slate")}>Primary</span>
                        )}
                      </div>
                      {source.subcategory && (
                        <span className={chipClass("slate")}>{source.subcategory}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-2.5">
                    {source.presenceStrength && (
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div className="min-w-0 space-y-1">
                          <p className={miniLabelClass}>Presence &amp; strength</p>
                          {renderBulletedProse(source.presenceStrength, bodyTextClass)}
                        </div>
                      </div>
                    )}
                    {source.durability && (
                      <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                        <div className="min-w-0 space-y-1">
                          <p className={miniLabelClass}>Durability</p>
                          {renderBulletedProse(source.durability, bodyTextClass)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`${dashedDetailClass} p-3 text-[12px] text-muted-foreground`}>
              {emptySourcesCopy}
            </div>
          )}

          {ruledOutSources.length > 0 && (
            <div className="space-y-2">
              <p className={miniLabelClass}>
                Also considered{" "}
                <span className="font-normal text-muted-foreground">
                  ({ruledOutSources.length} ruled out)
                </span>
              </p>
              <ul className="space-y-2">
                {ruledOutSources.map((source, index) => (
                  <li
                    key={`ruled-out-${source.sourceType}-${index}`}
                    className={`${dashedDetailClass} p-2.5`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[12px] font-semibold text-foreground/85">
                        {source.sourceType}
                      </p>
                      {source.subcategory && (
                        <span className={chipClass("slate")}>{source.subcategory}</span>
                      )}
                    </div>
                    {source.doesNotApplyReason ? (
                      <div className="mt-1.5">
                        {renderBulletedProse(source.doesNotApplyReason, mutedBodyClass)}
                      </div>
                    ) : (
                      <p className={cn(mutedBodyClass, "mt-1.5 italic")}>
                        No rationale captured.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className={`${elevatedBlockClass} p-3 space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className={sectionTitleClass}>Barrier strength</p>
                <p className={sectionSubtitleClass}>
                  How well protected from a well-funded competitor?
                </p>
              </div>
              {barrierVerdict && (
                <span className={chipClass(barrierVerdict.tone)}>{barrierVerdict.label}</span>
              )}
            </div>
            {gatekeeper?.note ? (
              renderBulletedProse(gatekeeper.note, bodyTextClass)
            ) : (
              <p className={mutedBodyClass}>No barrier rationale captured.</p>
            )}
          </div>

          <div className={`${elevatedBlockClass} p-3 space-y-3`}>
            <div className="space-y-0.5">
              <p className={sectionTitleClass}>Economic proof</p>
              <p className={sectionSubtitleClass}>
                Returns vs. cost of capital, and resilience through cycles.
              </p>
            </div>
            {financial?.roicVsWacc && renderBulletedProse(financial.roicVsWacc, bodyTextClass)}
            {financial?.note && renderBulletedProse(financial.note, mutedBodyClass)}
            {!financial?.roicVsWacc && !financial?.note && (
              <p className={mutedBodyClass}>No economic proof captured.</p>
            )}
          </div>

          <div className={`${elevatedBlockClass} p-3 space-y-3`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5">
                  <p className={sectionTitleClass}>Watch for</p>
                  <p className={sectionSubtitleClass}>Signals that would break this thesis.</p>
                </div>
              </div>
              {triggerCount > 0 && (
                <span className={chipClass("amber")}>
                  {triggerCount} trigger{triggerCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {triggerCount > 0 ? (
              <ul className="space-y-2">
                {analysis.whatWouldChangeTheCall.map((trigger, index) => (
                  <li
                    key={`${trigger.slice(0, 32)}-${index}`}
                    className={`${nestedDetailClass} p-3 text-[13px] leading-relaxed text-foreground/90`}
                  >
                    {trigger}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={mutedBodyClass}>No change-triggers captured yet.</p>
            )}
          </div>
        </div>

        {footerBits.length > 0 && (
          <p className={cn(metadataClass, "pt-1")}>{footerBits.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
