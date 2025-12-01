"use client";

import { ConsolidatedStrategy } from "../types";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface CompetitiveStrategyDisplayProps {
  strategies: ConsolidatedStrategy[];
}

export function CompetitiveStrategyDisplay({
  strategies,
}: CompetitiveStrategyDisplayProps) {
  const [timelineScrollPos, setTimelineScrollPos] = useState<
    Record<string, number>
  >({});
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(
    new Set()
  );

  const toggleStrategy = (strategyId: string) => {
    const newExpanded = new Set(expandedStrategies);
    if (newExpanded.has(strategyId)) {
      newExpanded.delete(strategyId);
    } else {
      newExpanded.add(strategyId);
    }
    setExpandedStrategies(newExpanded);
  };

  const isExpanded = (strategyId: string) => {
    return expandedStrategies.has(strategyId);
  };

  if (!strategies || strategies.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No competitive strategies data available
      </div>
    );
  }

  // Group strategies by segment
  const strategiesBySegment = strategies.reduce((acc, strategy) => {
    if (!acc[strategy.segment_name]) {
      acc[strategy.segment_name] = [];
    }
    acc[strategy.segment_name].push(strategy);
    return acc;
  }, {} as Record<string, ConsolidatedStrategy[]>);

  const renderTimelineCard = (period: string, event: unknown) => {
    // Check if detailed timeline
    const isDetailedTimeline =
      event &&
      typeof event === "object" &&
      !Array.isArray(event) &&
      ("status" in event ||
        "outcome" in event ||
        "progress" in event ||
        "key_event" in event ||
        "revenue_impact" in event);

    if (!isDetailedTimeline) return null;

    const detail = event as Record<string, unknown>;
    const status = detail.status ? String(detail.status) : null;
    const outcome = detail.outcome ? String(detail.outcome) : null;
    const revenueImpact = detail.revenue_impact
      ? String(detail.revenue_impact)
      : null;
    const overview = detail.overview ? String(detail.overview) : null;
    const keyEvents = Array.isArray(detail.key_events)
      ? (detail.key_events as string[])
      : null;
    const evolutionNotes = detail.evolution_notes
      ? String(detail.evolution_notes)
      : null;
    const strategicShift = detail.strategic_shift
      ? String(detail.strategic_shift)
      : null;
    const keyTransition = detail.key_transition === true;

    return (
      <div
        key={period}
        className={`border rounded-lg p-4 transition-colors flex-shrink-0 w-80 ${
          keyTransition
            ? "border-amber-600/50 bg-amber-950/20 hover:bg-amber-950/30"
            : "border-gray-700/50 bg-gray-900/30 hover:bg-gray-900/50"
        }`}
      >
        {/* Year Header with Status */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-blue-300 uppercase tracking-wide">
              {period}
            </span>
            {keyTransition && (
              <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-500/30 text-amber-300 border border-amber-500/50">
                Key Transition
              </span>
            )}
          </div>
          {status && (
            <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-500/20 text-blue-300 capitalize">
              {status}
            </span>
          )}
        </div>

        {/* Content Grid */}
        <div className="space-y-3 text-sm">
          {/* Status Tags Row */}
          {(outcome || revenueImpact) && (
            <div className="flex flex-wrap gap-2">
              {outcome && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Outcome: {outcome}
                </span>
              )}
              {revenueImpact && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    revenueImpact.toUpperCase() === "HIGH"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-gray-600/20 text-gray-300"
                  }`}
                >
                  Revenue: {revenueImpact}
                </span>
              )}
            </div>
          )}

          {/* Overview */}
          {overview && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                Overview
              </p>
              <p className="text-gray-300 leading-relaxed text-xs">
                {overview}
              </p>
            </div>
          )}

          {/* Key Events */}
          {keyEvents && keyEvents.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">
                Key Events ({keyEvents.length})
              </p>
              <ul className="space-y-1 ml-2">
                {keyEvents.slice(0, 3).map((event, idx) => (
                  <li
                    key={idx}
                    className="text-gray-300 flex items-start gap-2 text-xs"
                  >
                    <span className="text-blue-400 font-bold mt-0.5">•</span>
                    <span>{event}</span>
                  </li>
                ))}
                {keyEvents.length > 3 && (
                  <li className="text-gray-400 text-xs italic">
                    +{keyEvents.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Evolution Notes */}
          {evolutionNotes && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                Evolution
              </p>
              <p className="text-gray-300 leading-relaxed text-xs italic">
                {evolutionNotes}
              </p>
            </div>
          )}

          {/* Strategic Shift */}
          {strategicShift && (
            <div className="bg-purple-950/30 border border-purple-700/30 rounded p-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                Strategic Shift
              </p>
              <p className="text-sm text-purple-300 leading-relaxed">
                {strategicShift}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(strategiesBySegment).map(
        ([segment, segmentStrategies]) => (
          <div key={segment} className="space-y-3">
            {/* Segment Title */}
            <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
              {segment}
            </h4>

            {/* Strategies for this segment */}
            <div className="space-y-2">
              {segmentStrategies.map((strategy, index) => {
                const strategyId = `${segment}-${strategy.id}`;
                const isFirstCard = index === 0;
                const shouldShowTimeline =
                  isFirstCard || isExpanded(strategyId);
                return (
                  <div
                    key={strategy.id}
                    className="rounded-lg overflow-hidden bg-gray-900/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
                  >
                    {/* Strategy Header */}
                    <button
                      onClick={() => !isFirstCard && toggleStrategy(strategyId)}
                      className={`w-full text-left p-3 flex items-center justify-between ${
                        !isFirstCard
                          ? "cursor-pointer hover:bg-gray-800/30"
                          : ""
                      }`}
                      disabled={isFirstCard}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded flex-shrink-0">
                          {strategy.strategy_rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-white line-clamp-2">
                            {strategy.strategy_name}
                          </h3>
                        </div>
                      </div>
                      {!isFirstCard && (
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                            isExpanded(strategyId) ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>

                    {/* Divider */}
                    <div className="border-b border-gray-700/50" />

                    {/* Timeline Carousel - Visible for first card or when expanded */}
                    {shouldShowTimeline &&
                      strategy.timeline &&
                      typeof strategy.timeline === "object" &&
                      Object.keys(strategy.timeline).length > 0 && (
                        <div className="p-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            Timeline
                          </p>
                          {(() => {
                            const timelineKey = `timeline-${strategy.id}`;
                            const timelineEntries = Object.entries(
                              strategy.timeline as Record<string, unknown>
                            );
                            const isScrollable = timelineEntries.length > 3;
                            const maxScroll = Math.max(
                              0,
                              timelineEntries.length - 3
                            );
                            const defaultScrollPos = maxScroll; // Start at the end to show latest 3
                            const scrollPos =
                              timelineScrollPos[timelineKey] ??
                              defaultScrollPos;
                            const visibleEntries = timelineEntries.slice(
                              scrollPos,
                              scrollPos + 3
                            );

                            return (
                              <div className="flex items-center gap-2">
                                {/* Left Arrow */}
                                {scrollPos > 0 && (
                                  <button
                                    onClick={() =>
                                      setTimelineScrollPos({
                                        ...timelineScrollPos,
                                        [timelineKey]: Math.max(
                                          0,
                                          scrollPos - 1
                                        ),
                                      })
                                    }
                                    className="flex-shrink-0 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
                                  >
                                    <ChevronLeft className="w-4 h-4 text-gray-300" />
                                  </button>
                                )}
                                {!isScrollable && <div className="w-10" />}

                                {/* Cards Container */}
                                <div className="flex gap-3 flex-1 overflow-hidden">
                                  {visibleEntries.map(([period, event]) =>
                                    renderTimelineCard(period, event)
                                  )}
                                </div>

                                {/* Right Arrow */}
                                {scrollPos < maxScroll && (
                                  <button
                                    onClick={() =>
                                      setTimelineScrollPos({
                                        ...timelineScrollPos,
                                        [timelineKey]: Math.min(
                                          scrollPos + 1,
                                          maxScroll
                                        ),
                                      })
                                    }
                                    className="flex-shrink-0 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
                                  >
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                  </button>
                                )}
                                {!isScrollable && <div className="w-10" />}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
