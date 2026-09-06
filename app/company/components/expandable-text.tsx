"use client";

import { useEffect, useRef, useState } from "react";
import { TOUCH_TARGET } from "@/lib/design/shell";
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
  // Only offer the toggle when the clamp actually hides something: measure the
  // paragraph while collapsed (and again on resize, since the clamp is
  // breakpoint-dependent in mobileOnly mode). Server/first render assumes it
  // overflows, so the button is present until measured — never missing.
  const [overflows, setOverflows] = useState(true);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  // Out-of-range values can only arrive from a non-TS caller; fall back to 2
  // rather than throwing inside render.
  const clampClass = (CLAMP_CLASS[previewLines] ?? CLAMP_CLASS[2])[mobileOnly ? "mobile" : "always"];

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      if (isExpanded) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isExpanded, text, clampClass]);

  return (
    <div className="max-w-4xl">
      <p
        ref={textRef}
        className={cn(
          "text-sm leading-relaxed text-foreground/88",
          className,
          isExpanded ? "" : clampClass,
        )}
      >
        {text}
      </p>
      {(overflows || isExpanded) && (
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
        className={cn(
          "mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:border-border hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
          TOUCH_TARGET,
          mobileOnly && "sm:hidden",
          buttonClassName,
        )}
      >
        <span>{isExpanded ? "Show less" : "Show more"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
      </button>
      )}
    </div>
  );
}
