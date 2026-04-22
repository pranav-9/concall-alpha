import type { MoatRatingKey, NormalizedMoatAnalysis } from "@/lib/moat-analysis/types";
import { cn } from "@/lib/utils";

type MoatAnalysisSectionProps = {
  analysis: NormalizedMoatAnalysis;
  generatedAtShort: string | null;
};

type ChipTone = "emerald" | "sky" | "amber" | "rose" | "violet" | "slate";

const outerCardClass =
  "rounded-[1.45rem] border border-border/25 bg-gradient-to-br from-background/96 via-background/91 to-muted/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_14px_24px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:from-background/88 dark:via-background/82 dark:to-background/70";

const nestedCardClass = "rounded-xl border border-border/30 bg-background/62";

const chipBaseClass =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none";

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

const formatCompactLabel = (value: string) => value.replace(/_/g, " ").trim();

const formatVersionLabel = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^moat_assessment_/i, "").replace(/_/g, ".");
};

const chipClass = (tone: ChipTone) => cn(chipBaseClass, toneClasses[tone]);

const statusTone = (status: string | null, present: boolean): ChipTone => {
  const normalized = (status ?? "").trim().toUpperCase();
  if (normalized === "PRESENT" || present) return "emerald";
  if (normalized === "PARTIAL") return "amber";
  if (normalized === "ABSENT") return "rose";
  return "slate";
};

const statusLabel = (status: string | null, present: boolean) => {
  const normalized = (status ?? "").trim().toUpperCase();
  if (normalized) return formatCompactLabel(normalized);
  return present ? "PRESENT" : "ABSENT";
};

const pillarTone = (pillarStatus: string | null, present: boolean) => statusTone(pillarStatus, present);

const sourceTypeTone = (sourceType: string | null): ChipTone => {
  const normalized = (sourceType ?? "").toLowerCase();
  if (normalized.includes("intangible") || normalized.includes("demand")) return "sky";
  if (normalized.includes("cost") || normalized.includes("supply")) return "emerald";
  if (normalized.includes("switch")) return "violet";
  if (normalized.includes("network")) return "amber";
  return "slate";
};

const verdictTone = (value: string | null): ChipTone => {
  const normalized = (value ?? "").toLowerCase();
  if (!normalized) return "slate";
  if (
    normalized.includes("confirm") ||
    normalized.includes("favour") ||
    normalized.includes("favor") ||
    normalized.includes("positive") ||
    normalized.includes("included")
  ) {
    return "emerald";
  }
  if (
    normalized.includes("not") ||
    normalized.includes("negative") ||
    normalized.includes("weak") ||
    normalized.includes("absent") ||
    normalized.includes("unfavour") ||
    normalized.includes("unfavor")
  ) {
    return "rose";
  }
  return "amber";
};

const ratingClass = (rating: MoatRatingKey) => {
  switch (rating) {
    case "wide_moat":
      return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600/50 dark:bg-emerald-900/35 dark:text-emerald-200";
    case "narrow_moat":
      return "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-600/50 dark:bg-sky-900/35 dark:text-sky-200";
    case "no_moat":
      return "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-600/50 dark:bg-rose-900/35 dark:text-rose-200";
    case "moat_at_risk":
      return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/50 dark:bg-amber-900/35 dark:text-amber-200";
    default:
      return "border-border/60 bg-muted/60 text-foreground";
  }
};

const verdictBadgeClass = (value: string | null) => cn(chipBaseClass, toneClasses[verdictTone(value)]);

const sourceGroupToneClass = (tone: ChipTone) => {
  switch (tone) {
    case "emerald":
      return "border-emerald-200/55 bg-emerald-50/20 dark:border-emerald-700/30 dark:bg-emerald-950/18";
    case "amber":
      return "border-amber-200/55 bg-amber-50/20 dark:border-amber-700/30 dark:bg-amber-950/18";
    case "rose":
      return "border-rose-200/55 bg-rose-50/20 dark:border-rose-700/30 dark:bg-rose-950/18";
    case "sky":
      return "border-sky-200/55 bg-sky-50/20 dark:border-sky-700/30 dark:bg-sky-950/18";
    case "violet":
      return "border-violet-200/55 bg-violet-50/20 dark:border-violet-700/30 dark:bg-violet-950/18";
    default:
      return "border-border/55 bg-background/35";
  }
};

const formatRiskSummary = (risk: { trigger: string | null; mechanism: string | null; sourceType: string | null }) => {
  const parts = [risk.trigger, risk.mechanism].filter((item): item is string => Boolean(item));
  if (parts.length > 0) return parts.join(" · ");
  return risk.sourceType ?? "Risk captured";
};

export function MoatAnalysisSection({ analysis, generatedAtShort }: MoatAnalysisSectionProps) {
  const summary =
    analysis.assessmentSummary ??
    analysis.porterSummary ??
    analysis.durability ??
    analysis.porterVerdict ??
    null;

  const presentPillars = analysis.moatPillars.filter(
    (pillar) => (pillar.status ?? "").toUpperCase() === "PRESENT" || pillar.present,
  );
  const partialPillars = analysis.moatPillars.filter(
    (pillar) => (pillar.status ?? "").toUpperCase() === "PARTIAL",
  );
  const absentPillars = analysis.moatPillars.filter((pillar) => {
    const normalized = (pillar.status ?? "").toUpperCase();
    return normalized === "ABSENT" || (!pillar.present && normalized !== "PARTIAL" && normalized !== "PRESENT");
  });

  const sourceGroups = [
    {
      key: "present",
      title: "Present",
      tone: "emerald" as const,
      description: "Evidence captured and marked as present.",
      pillars: presentPillars,
    },
    {
      key: "partial",
      title: "Partial",
      tone: "amber" as const,
      description: "Evidence exists, but the moat is not fully closed yet.",
      pillars: partialPillars,
    },
    {
      key: "absent",
      title: "Absent / weak",
      tone: "rose" as const,
      description: "No durable evidence or the signal is weak.",
      pillars: absentPillars,
    },
  ].filter((group) => group.pillars.length > 0);

  const structuredRisks =
    analysis.moatRisks.length > 0
      ? analysis.moatRisks
      : analysis.risks.map((risk) => ({ trigger: risk, mechanism: null, sourceType: null }));

  const quantitative = analysis.quantitativeCheck;
  const industryStructure = analysis.industryStructure;
  const durability = analysis.durabilityDetails;
  const versionLabel = formatVersionLabel(analysis.assessmentVersion ?? analysis.schemaVersion);

  return (
    <div className={`${outerCardClass} space-y-4 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(chipBaseClass, ratingClass(analysis.moatRating), "px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]")}>
              {analysis.moatRatingLabel}
            </span>
            {analysis.trajectory && (
              <span className={chipClass("slate")}>
                {analysis.trajectoryDirection
                  ? `${analysis.trajectory} ${analysis.trajectoryDirection}`
                  : analysis.trajectory}
              </span>
            )}
            {analysis.industry && <span className={chipClass("slate")}>{analysis.industry}</span>}
            {versionLabel && <span className={chipClass("slate")}>{versionLabel}</span>}
            {generatedAtShort && <span className={chipClass("slate")}>{generatedAtShort}</span>}
          </div>
          {summary && (
            <p className="max-w-4xl text-[13px] leading-relaxed text-foreground">
              {summary}
            </p>
          )}
        </div>

      </div>

      <div className="space-y-3">
        <div className={`${nestedCardClass} p-3 space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                Moat Sources
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {analysis.moatPillars.length} source{analysis.moatPillars.length === 1 ? "" : "s"} captured
                {presentPillars.length || partialPillars.length || absentPillars.length
                  ? ` · ${presentPillars.length} present${partialPillars.length ? ` · ${partialPillars.length} partial` : ""}${absentPillars.length ? ` · ${absentPillars.length} absent` : ""}`
                  : ""}
              </p>
            </div>
            <span className={chipClass("slate")}>{analysis.moatPillars.length} total</span>
          </div>

          {sourceGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {sourceGroups.map((group) => (
                <div key={group.key} className={`${sourceGroupToneClass(group.tone)} rounded-xl border p-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                        {group.title}
                      </p>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                    <span className={chipClass(group.tone)}>{group.pillars.length}</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {group.pillars.map((pillar, index) => {
                      const sourceLabel = pillar.sourceType && pillar.sourceType !== pillar.type ? pillar.sourceType : null;
                      const displayStatus = statusLabel(pillar.status, pillar.present);
                      const pillarChipTone = pillarTone(pillar.status, pillar.present);

                      return (
                        <div
                          key={`${pillar.type}-${group.key}-${index}`}
                          className="rounded-lg border border-border/35 bg-background/70 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-[12px] font-semibold text-foreground">{pillar.type}</p>
                                {sourceLabel && <span className={chipClass(sourceTypeTone(sourceLabel))}>{sourceLabel}</span>}
                                {pillar.greenwaldLabel && (
                                  <span className={chipClass(
                                    pillar.greenwaldLabel.toLowerCase().includes("supply")
                                      ? "emerald"
                                      : pillar.greenwaldLabel.toLowerCase().includes("demand")
                                        ? "sky"
                                        : "slate",
                                  )}>
                                    {pillar.greenwaldLabel}
                                  </span>
                                )}
                              </div>
                              {pillar.subcategory && pillar.subcategory !== pillar.type && (
                                <p className="text-[11px] leading-snug text-muted-foreground">
                                  Subcategory: {pillar.subcategory}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className={chipClass(pillarChipTone)}>{displayStatus}</span>
                              {pillar.score != null && (
                                <span className={chipClass("slate")}>Score {pillar.score}</span>
                              )}
                            </div>
                          </div>

                          {pillar.evidence ? (
                            <p className="mt-2 text-[11px] leading-relaxed text-foreground/90">
                              {pillar.evidence}
                            </p>
                          ) : (
                            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                              Evidence not captured.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/50 bg-background/45 p-3 text-[11px] text-muted-foreground">
              No moat sources were captured in the current payload.
            </div>
          )}
        </div>

        <div className={`${nestedCardClass} p-3 space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                Durability
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {durability?.synthesis ?? analysis.durability ?? "Durability narrative not captured."}
              </p>
            </div>
            <span className={chipClass("slate")}>
              {durability?.sourceStability.length ?? 0} source stability signal
              {(durability?.sourceStability.length ?? 0) === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/35 bg-background/70 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Source Stability
                </p>
                <span className={chipClass("slate")}>
                  {durability?.sourceStability.length ?? 0}
                </span>
              </div>

              {durability?.sourceStability.length ? (
                <div className="grid grid-cols-1 gap-2">
                  {durability.sourceStability.map((item, index) => (
                    <div key={`${item.stability ?? "stability"}-${index}`} className="rounded-lg border border-border/35 bg-background/70 p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.stability && <span className={chipClass("emerald")}>{item.stability}</span>}
                        {item.sourceType && <span className={chipClass(sourceTypeTone(item.sourceType))}>{item.sourceType}</span>}
                        {item.compounding && <span className={chipClass("violet")}>{item.compounding}</span>}
                      </div>
                      {item.assessment && (
                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                          {item.assessment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  No source stability signals captured.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border/35 bg-background/70 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Trajectory Evidence
                </p>
                <span className={chipClass("slate")}>
                  {durability?.trajectoryEvidence.length ?? 0}
                </span>
              </div>

              {durability?.trajectoryEvidence.length ? (
                <div className="space-y-2">
                  {durability.trajectoryEvidence.map((item, index) => (
                    <div key={`${item.signal ?? "signal"}-${index}`} className="rounded-lg border border-border/35 bg-background/70 p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.direction && <span className={chipClass("sky")}>{item.direction}</span>}
                        {item.dateHint && <span className={chipClass("slate")}>{item.dateHint}</span>}
                      </div>
                      {item.signal && (
                        <p className="mt-2 text-[11px] leading-relaxed text-foreground/90">{item.signal}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  No trajectory evidence captured.
                </p>
              )}
            </div>

            {durability?.competitiveThreatIntensity && (
              <div className="rounded-lg border border-amber-200/50 bg-amber-50/45 p-3 dark:border-amber-700/25 dark:bg-amber-900/15 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                    Competitive Threat
                  </p>
                  {durability.competitiveThreatIntensity.level && (
                    <span className={chipClass(verdictTone(durability.competitiveThreatIntensity.level))}>
                      {durability.competitiveThreatIntensity.level}
                    </span>
                  )}
                </div>
                {durability.competitiveThreatIntensity.paragraph && (
                  <p className="mt-2 text-[11px] leading-relaxed text-foreground/90">
                    {durability.competitiveThreatIntensity.paragraph}
                  </p>
                )}
                {durability.competitiveThreatIntensity.attackers.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {durability.competitiveThreatIntensity.attackers.map((attacker, index) => (
                      <div key={`${attacker.name ?? "attacker"}-${index}`} className="rounded-lg border border-border/35 bg-background/70 p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {attacker.name && <span className={chipClass("slate")}>{attacker.name}</span>}
                          {attacker.credibility && <span className={chipClass("amber")}>{attacker.credibility}</span>}
                        </div>
                        <div className="mt-2 space-y-1">
                          {attacker.capability && (
                            <p className="text-[11px] leading-relaxed text-foreground/90">
                              Capability: {attacker.capability}
                            </p>
                          )}
                          {attacker.motivation && (
                            <p className="text-[11px] leading-relaxed text-foreground/90">
                              Motivation: {attacker.motivation}
                            </p>
                          )}
                          {attacker.capitalPosition && (
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              Capital position: {attacker.capitalPosition}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className={`${nestedCardClass} p-3 space-y-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                  Industry Structure
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Porter framing from the moat run.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(industryStructure?.verdict ?? analysis.porterVerdict) && (
                  <span
                    className={verdictBadgeClass(
                      industryStructure?.verdict ?? analysis.porterVerdict,
                    )}
                  >
                    {industryStructure?.verdict ?? analysis.porterVerdict}
                  </span>
                )}
                {industryStructure?.included != null && (
                  <span className={chipClass(industryStructure.included ? "emerald" : "rose")}>
                    {industryStructure.included ? "Included" : "Not included"}
                  </span>
                )}
              </div>
            </div>

            {(industryStructure?.summary ?? analysis.porterSummary) && (
              <p className="text-[12px] leading-relaxed text-foreground/90">
                {industryStructure?.summary ?? analysis.porterSummary}
              </p>
            )}
          </div>

          <div className={`${nestedCardClass} p-3 space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                  Quantitative Test
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Capital efficiency and margin signal.
                </p>
              </div>
              {quantitative?.overallVerdict && (
                <span className={verdictBadgeClass(quantitative.overallVerdict)}>
                  {quantitative.overallVerdict}
                </span>
              )}
            </div>

            {quantitative?.basis && (
              <p className="text-[12px] leading-relaxed text-foreground/90">{quantitative.basis}</p>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quantitative?.roic && (
                <div className="rounded-lg border border-border/35 bg-background/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    ROIC / ROCE
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-foreground/90">{quantitative.roic}</p>
                </div>
              )}
              {quantitative?.marginCharacter && (
                <div className="rounded-lg border border-border/35 bg-background/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Margin character
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-foreground/90">
                    {quantitative.marginCharacter}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quantitative?.margins && (
                <span className={chipClass("slate")}>{quantitative.margins}</span>
              )}
              {quantitative?.marketShare && (
                <span className={chipClass("sky")}>{quantitative.marketShare}</span>
              )}
              {quantitative?.pricingPower && (
                <span className={chipClass("violet")}>{quantitative.pricingPower}</span>
              )}
            </div>
          </div>

          <div className={`${nestedCardClass} p-3 space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                  Moat Risks
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {structuredRisks.length} risk{structuredRisks.length === 1 ? "" : "s"} captured.
                </p>
              </div>
            </div>

            {structuredRisks.length > 0 ? (
              <div className="space-y-2">
                {structuredRisks.map((risk, index) => (
                  <div key={`${risk.trigger ?? "risk"}-${index}`} className="rounded-lg border border-border/35 bg-background/70 p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {risk.sourceType && <span className={chipClass(sourceTypeTone(risk.sourceType))}>{risk.sourceType}</span>}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-foreground/90">
                      {formatRiskSummary(risk)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/50 bg-background/45 p-3 text-[11px] text-muted-foreground">
                No moat risks captured yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
