"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  className?: string;
  buttonClassName?: string;
  previewLines?: number;
}

export function ExpandableText({
  text,
  className = "",
  buttonClassName = "",
  previewLines = 2,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const clampClass =
    previewLines === 2
      ? "line-clamp-2"
      : previewLines === 3
        ? "line-clamp-3"
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
          buttonClassName,
        )}
      >
        <span>{isExpanded ? "Show less" : "Show more"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
      </button>
    </div>
  );
}
