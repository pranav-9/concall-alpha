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
          ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
          : "bg-gray-600/20 text-gray-200 border border-gray-600/40"
      }`}
    >
      Impact: {impact}
    </Badge>
  );
};

export function TopStrategiesDisplay({ strategies }: TopStrategiesDisplayProps) {
  if (!strategies || strategies.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
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

  const latestYear = sorted[0]?.latest_fiscal_year;
  const latestStrategies = sorted
    .filter((s) => s.latest_fiscal_year === latestYear)
    .sort((a, b) => a.strategy_rank - b.strategy_rank);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-gray-800 text-gray-200 text-[11px] px-2 py-0.5">
            Fiscal Year: {latestYear}
          </Badge>
          <span className="text-xs text-gray-400">
            Top strategies (ranks 1-3)
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          Curated from latest transcripts
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {latestStrategies.map((strategy) => {
          const evidenceList = parseStringArray(strategy.evidence_points);

          return (
            <div
              key={strategy.id}
              className="rounded-lg border border-gray-800 bg-gray-900/50 p-3.5 shadow-sm shadow-black/20 flex h-full flex-col gap-2.5"
            >
              <div className="flex items-start gap-2">
                <Badge className="text-[11px] px-2 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-500/30">
                  #{strategy.strategy_rank}
                </Badge>
                {getImpactBadge(strategy.impact_level)}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-white leading-tight">
                  {strategy.strategy_name}
                </p>
                {strategy.impact_summary && (
                  <p className="text-[11px] text-emerald-200 leading-snug">
                    {strategy.impact_summary}
                  </p>
                )}
                {strategy.timeline && (
                  <div className="flex items-start gap-1.5 text-[11px] text-gray-300">
                    <Clock className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                    <span>{strategy.timeline}</span>
                  </div>
                )}
              </div>

              {strategy.description && (
                <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">
                  {strategy.description}
                </p>
              )}

              {strategy.impact_value !== null && strategy.impact_value !== undefined && (
                <div className="flex items-center gap-2 text-[11px] text-gray-300">
                  <Target className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-semibold text-emerald-200">
                    Impact: {strategy.impact_value}
                    {strategy.impact_units ? ` ${strategy.impact_units}` : ""}
                  </span>
                </div>
              )}

              {evidenceList.length > 0 && (
                <div className="mt-auto space-y-2">
                  <details className="group rounded-lg border border-gray-700/60 bg-gray-900/40 p-3">
                    <summary className="flex cursor-pointer items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-gray-300 list-none">
                      <span className="flex items-center gap-2">
                        <span>Evidence</span>
                        <span className="text-gray-400 text-[10px] normal-case">
                          {evidenceList.length} point{evidenceList.length > 1 ? "s" : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-gray-400 text-[10px] font-semibold uppercase tracking-wide">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200">Show</span>
                        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                      </span>
                    </summary>
                    <div className="mt-3 space-y-1.5">
                      {evidenceList.map((point, idx) => (
                        <div
                          key={idx}
                          className="rounded border border-gray-700 bg-gray-800/70 px-3 py-2 text-[11px] text-gray-200 shadow-sm"
                        >
                          {point}
                        </div>
                      ))}
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
}
