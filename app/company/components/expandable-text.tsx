"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  className?: string;
  buttonClassName?: string;
  previewLines?: number;
  /** Clamp and show the toggle only below `sm`; from `sm` the full text renders. */
  mobileOnly?: boolean;
}

export function ExpandableText({
  text,
  className = "",
  buttonClassName = "",
  previewLines = 2,
  mobileOnly = false,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = previewLines === 3 ? 3 : previewLines === 4 ? 4 : 2;
  const clampClass = mobileOnly
    ? lines === 3
      ? "max-sm:line-clamp-3"
      : lines === 4
        ? "max-sm:line-clamp-4"
        : "max-sm:line-clamp-2"
    : lines === 3
      ? "line-clamp-3"
      : lines === 4
        ? "line-clamp-4"
        : "line-clamp-2";

  return (
    <div className="max-w-4xl">
      <p
        className={cn(
          "text-sm leading-relaxed text-foreground/88",
          className,
          isExpanded ? "" : clampClass,
        )}
      >
        {text}
      </p>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground",
          mobileOnly && "sm:hidden",
          buttonClassName,
        )}
      >
        <span>{isExpanded ? "Show less" : "Show more"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
      </button>
    </div>
  );
}
