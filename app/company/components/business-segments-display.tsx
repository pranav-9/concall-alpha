"use client";

import { BusinessSegment } from "../types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface BusinessSegmentsDisplayProps {
  segments: BusinessSegment[];
}

export function BusinessSegmentsDisplay({
  segments,
}: BusinessSegmentsDisplayProps) {
  if (!segments || segments.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No business segments data available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Segment Count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded">
          Total Segments: {segments.length}
        </span>
      </div>

      <Carousel className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4 ">
          {segments.map((segment, index) => (
            <CarouselItem
              key={segment.id}
              className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/2"
            >
              <div className="border border-gray-700 rounded-lg p-4 h-full flex flex-col bg-gray-900/50 hover:border-gray-600 transition-colors">
                {/* Segment Header: Number and Name and Type */}
                <div className="mb-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-white line-clamp-2">
                        {segment.canonical_name}
                      </h3>
                      {segment.segment_type && (
                        <p className="text-xs text-gray-400 mt-1">
                          {segment.segment_type}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {segment.description && (
                  <p className="text-sm text-gray-300 mb-3 leading-relaxed line-clamp-3 flex-grow">
                    {segment.description}
                  </p>
                )}

                {/* Sub-segments */}
                {segment.sub_segments && segment.sub_segments.length > 0 && (
                  <div className="mt-auto pt-3">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                      Sub-segments
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {segment.sub_segments.slice(0, 3).map((sub, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-800 rounded text-gray-300 text-xs"
                        >
                          {sub}
                        </span>
                      ))}
                      {segment.sub_segments.length > 3 && (
                        <span className="px-2 py-1 text-gray-500 text-xs">
                          +{segment.sub_segments.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation buttons below the carousel */}
        <div className="hidden md:flex items-center justify-center gap-4 mt-4">
          <CarouselPrevious className="relative inset-0 transform-none" />
          <CarouselNext className="relative inset-0 transform-none" />
        </div>
      </Carousel>
    </div>
  );
}
