"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  className?: string;
  buttonClassName?: string;
  previewLines?: 2 | 3 | 4;
  /** Clamp and show the toggle only below `sm`; from `sm` the full text renders. */
  mobileOnly?: boolean;
}

// Full literal class strings so Tailwind's scanner generates every variant.
const CLAMP_CLASS = {
  2: { always: "line-clamp-2", mobile: "max-sm:line-clamp-2" },
  3: { always: "line-clamp-3", mobile: "max-sm:line-clamp-3" },
  4: { always: "line-clamp-4", mobile: "max-sm:line-clamp-4" },
} as const;

export function ExpandableText({
  text,
  className = "",
  buttonClassName = "",
  previewLines = 2,
  mobileOnly = false,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const clampClass = CLAMP_CLASS[previewLines][mobileOnly ? "mobile" : "always"];

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
