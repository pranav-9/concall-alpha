"use client";

import { TopStrategyLatest } from "../types";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles, Target, ChevronDown } from "lucide-react";

interface TopStrategiesDisplayProps {
  strategies: TopStrategyLatest[];
}

const getImpactBadge = (impact: string | null) => {
  if (!impact) return null;
  const isHigh = impact.toUpperCase() === "HIGH";
  return (
    <Badge
      className={`text-[11px] px-2 py-0.5 ${
        isHigh
          ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40"
          : "bg-muted text-foreground border border-border"
      }`}
    >
      Impact: {impact}
    </Badge>
  );
};

export function TopStrategiesDisplay({ strategies }: TopStrategiesDisplayProps) {
  if (!strategies || strategies.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No strategy data available
      </div>
    );
  }

  const parseStringArray = (value: string[] | string | null | undefined) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parseYear = (fy: string) => {
    const match = fy.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const sorted = [...strategies].sort((a, b) => {
    const yearDiff = parseYear(b.latest_fiscal_year) - parseYear(a.latest_fiscal_year);
    if (yearDiff !== 0) return yearDiff;
    return a.strategy_rank - b.strategy_rank;
  });
  const years = Array.from(new Set(sorted.map((s) => s.latest_fiscal_year))).slice(
    0,
    5
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-muted text-foreground border border-border text-[11px] px-2 py-0.5">
            Latest Fiscal Years: {years.join(", ")}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Top strategies (ranks 1-3) per year
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          Curated from latest transcripts
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {years.map((year) => {
          const strategiesForYear = sorted
            .filter((s) => s.latest_fiscal_year === year)
            .sort((a, b) => a.strategy_rank - b.strategy_rank);
          const blockBg = "bg-card border border-border";

          return (
            <div
              key={year}
              className={`space-y-3 rounded-xl p-3 ${blockBg}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 border border-emerald-500/30 shadow-sm shadow-emerald-900/20">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-200 uppercase tracking-wide">
                    Fiscal Year
                  </span>
                  <span className="text-sm font-bold text-emerald-800 dark:text-emerald-100">
                    {year}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {strategiesForYear.map((strategy) => {
                  const evidenceList = parseStringArray(strategy.evidence_points);

                  return (
                    <div
                      key={strategy.id}
                      className="rounded-lg border border-border bg-muted/40 p-3.5 shadow-sm flex h-full flex-col gap-2.5"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30">
                          #{strategy.strategy_rank}
                        </Badge>
                        {getImpactBadge(strategy.impact_level)}
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {strategy.strategy_name}
                        </p>
                      </div>

                      <div className="space-y-1">
                        {strategy.impact_summary && (
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-200 leading-snug">
                            {strategy.impact_summary}
                          </p>
                        )}
                        {strategy.timeline && (
                          <div className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                            <span>{strategy.timeline}</span>
                          </div>
                        )}
                      </div>

                      {(strategy.description ||
                        (strategy.impact_value !== null &&
                          strategy.impact_value !== undefined) ||
                        evidenceList.length > 0) && (
                        <div className="mt-auto">
                          <details className="group rounded-lg border border-border bg-muted/30 p-3">
                            <summary className="flex cursor-pointer items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-foreground/80 list-none">
                              <span className="flex items-center gap-2">
                                <span>Show more</span>
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                              </span>
                            </summary>
                            <div className="mt-3 space-y-3">
                              {strategy.description && (
                                <p className="text-xs text-foreground/80 leading-relaxed">
                                  {strategy.description}
                                </p>
                              )}
                              {strategy.impact_value !== null &&
                                strategy.impact_value !== undefined && (
                                  <div className="flex items-center gap-2 text-[11px] text-foreground/80">
                                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-200">
                                      Impact: {strategy.impact_value}
                                      {strategy.impact_units
                                        ? ` ${strategy.impact_units}`
                                        : ""}
                                    </span>
                                  </div>
                                )}
                              {evidenceList.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Evidence
                                  </p>
                                  <div className="space-y-1.5">
                                    {evidenceList.map((point, idx) => (
                                      <div
                                        key={idx}
                                        className="rounded border border-border bg-muted px-3 py-2 text-[11px] text-foreground shadow-sm"
                                      >
                                        {point}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
