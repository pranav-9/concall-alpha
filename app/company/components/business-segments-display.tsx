"use client";

import { BusinessSegment } from "../types";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface BusinessSegmentsDisplayProps {
  segments: BusinessSegment[];
}

export function BusinessSegmentsDisplay({
  segments,
}: BusinessSegmentsDisplayProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(
    new Set()
  );

  const toggleSegment = (segmentId: number) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(segmentId)) {
      newExpanded.delete(segmentId);
    } else {
      newExpanded.add(segmentId);
    }
    setExpandedSegments(newExpanded);
  };

  const isExpanded = (segmentId: number) => {
    return expandedSegments.has(segmentId);
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No business segments data available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sub-heading with count */}
      <div>
        <h5 className="text-xs text-foreground/80 font-semibold tracking-wide">
          Business Segments ({segments.length})
        </h5>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className="rounded-xl overflow-hidden flex flex-col bg-muted/40 border border-border shadow-sm transition-all duration-300 hover:bg-muted/60"
          >
            {/* Segment Header: Always Visible */}
            <button
              onClick={() => toggleSegment(segment.id)}
              className="flex items-center justify-between w-full p-3 text-left hover:bg-accent transition-colors"
            >
              <div className="flex items-start gap-2 flex-1">
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-base text-foreground line-clamp-2">
                    {segment.canonical_name}
                  </h3>
                  {segment.segment_type && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {segment.segment_type}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ml-2 ${
                  isExpanded(segment.id) ? "transform rotate-180" : ""
                }`}
              />
            </button>

            {/* Expandable Content */}
            {isExpanded(segment.id) && (
              <div className="border-t border-border px-3.5 py-3 bg-muted/30 space-y-3">
                {/* Description */}
                {segment.description && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Description
                    </p>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {segment.description}
                    </p>
                  </div>
                )}

                {/* Sub-segments */}
                {segment.sub_segments && segment.sub_segments.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Sub-segments ({segment.sub_segments.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {segment.sub_segments.map((sub, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-muted rounded text-foreground/80 border border-border text-[11px]"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
